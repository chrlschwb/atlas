import { generateChannelMetaTags } from '@joystream/atlas-meta-server/src/tags'
import { FC, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useParams, useSearchParams } from 'react-router-dom'

import { useChannelNftCollectors, useFullChannel } from '@/api/hooks/channel'
import { OwnedNftOrderByInput, VideoOrderByInput } from '@/api/queries/__generated__/baseTypes.generated'
import { SvgActionCheck, SvgActionFilters, SvgActionFlag, SvgActionMore, SvgActionPlus } from '@/assets/icons'
import { EmptyFallback } from '@/components/EmptyFallback'
import { FiltersBar, useFiltersBar } from '@/components/FiltersBar'
import { LimitedWidthContainer } from '@/components/LimitedWidthContainer'
import { NumberFormat } from '@/components/NumberFormat'
import { Text } from '@/components/Text'
import { ViewErrorFallback } from '@/components/ViewErrorFallback'
import { ViewWrapper } from '@/components/ViewWrapper'
import { Button } from '@/components/_buttons/Button'
import { ChannelCover } from '@/components/_channel/ChannelCover'
import { CollectorsBox } from '@/components/_channel/CollectorsBox'
import { ContextMenu } from '@/components/_overlays/ContextMenu'
import { ReportModal } from '@/components/_overlays/ReportModal'
import { atlasConfig } from '@/config'
import { absoluteRoutes } from '@/config/routes'
import { NFT_SORT_OPTIONS, VIDEO_SORT_OPTIONS } from '@/config/sorting'
import { useHandleFollowChannel } from '@/hooks/useHandleFollowChannel'
import { useHeadTags } from '@/hooks/useHeadTags'
import { useMediaMatch } from '@/hooks/useMediaMatch'
import { useVideoGridRows } from '@/hooks/useVideoGridRows'
import { useAsset } from '@/providers/assets/assets.hooks'
import { transitions } from '@/styles'
import { SentryLogger } from '@/utils/logs'

import { ChannelSearch } from './ChannelSearch'
import { useSearchVideos } from './ChannelView.hooks'
import {
  CollectorsBoxContainer,
  FilterButton,
  NotFoundChannelContainer,
  StyledButton,
  StyledButtonContainer,
  StyledChannelLink,
  StyledSelect,
  StyledTabs,
  SubTitle,
  SubTitleSkeletonLoader,
  TabsContainer,
  TabsWrapper,
  TitleContainer,
  TitleSection,
  TitleSkeletonLoader,
} from './ChannelView.styles'
import { ChannelAbout, ChannelNfts, ChannelVideos } from './ChannelViewTabs'
import { TABS } from './utils'

export const INITIAL_TILES_PER_ROW = 4

export const ChannelView: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [tilesPerRow, setTilesPerRow] = useState(INITIAL_TILES_PER_ROW)
  const currentTabName = searchParams.get('tab') as typeof TABS[number] | null
  const videoRows = useVideoGridRows('main')
  const navigate = useNavigate()
  const [showReportDialog, setShowReportDialog] = useState(false)

  const tilesPerPage = videoRows * tilesPerRow

  // At mount set the tab from the search params
  // This hook has to come before useRedirectMigratedContent so it doesn't messes it's navigate call
  const initialRender = useRef(true)
  useEffect(() => {
    if (initialRender.current) {
      const tabIndex = TABS.findIndex((t) => t === currentTabName)
      if (tabIndex === -1) setSearchParams({ 'tab': 'Videos' }, { replace: true })
      initialRender.current = false
    }
  })

  const smMatch = useMediaMatch('sm')
  const { id } = useParams()
  const {
    channel,
    loading,
    error: channelError,
  } = useFullChannel(id ?? '', {
    onError: (error) => SentryLogger.error('Failed to fetch channel', 'ChannelView', error, { channel: { id } }),
  })
  const {
    foundVideos,
    loadingSearch,
    isSearchInputOpen,
    setIsSearchingInputOpen,
    isSearching,
    setIsSearching,
    submitSearch,
    searchError,
    searchQuery,
    setSearchQuery,
    searchedText,
  } = useSearchVideos({
    id: id ?? '',
    onError: (error) =>
      SentryLogger.error('Failed to search channel videos', 'ChannelView', error, {
        search: { channelId: id, query: searchQuery },
      }),
  })
  const { channelNftCollectors } = useChannelNftCollectors({ where: { channel: { id_eq: id } } })

  const { toggleFollowing, isFollowing } = useHandleFollowChannel(id, channel?.title)
  const [currentTab, setCurrentTab] = useState<typeof TABS[number]>(TABS[0])

  const { url: avatarPhotoUrl } = useAsset(channel?.avatarPhoto)
  const { url: coverPhotoUrl } = useAsset(channel?.coverPhoto)

  const [sortNftsBy, setSortNftsBy] = useState<OwnedNftOrderByInput>(OwnedNftOrderByInput.CreatedAtDesc)
  const [sortVideosBy, setSortVideosBy] = useState<VideoOrderByInput>(VideoOrderByInput.CreatedAtDesc)

  const handleVideoSorting = (value?: unknown) => {
    if (value) {
      setSortVideosBy(value as VideoOrderByInput)
    }
  }
  const handleNftSorting = (value?: unknown) => {
    if (value) {
      setSortNftsBy(value as OwnedNftOrderByInput)
    }
  }

  const filtersBarLogic = useFiltersBar()
  const {
    filters: { setIsFiltersOpen, isFiltersOpen },
    ownedNftWhereInput,
    canClearFilters: { canClearAllFilters, clearAllFilters },
  } = filtersBarLogic

  const toggleFilters = () => {
    setIsFiltersOpen((value) => !value)
  }

  const channelMetaTags = useMemo(() => {
    if (!channel || !avatarPhotoUrl) return {}
    return generateChannelMetaTags(
      channel,
      avatarPhotoUrl,
      atlasConfig.general.appName,
      window.location.origin,
      atlasConfig.general.appTwitterId
    )
  }, [channel, avatarPhotoUrl])
  const headTags = useHeadTags(channel?.title, channelMetaTags)

  const handleSetCurrentTab = async (tab: number) => {
    if (TABS[tab] === 'Videos' && isSearching) {
      setIsSearchingInputOpen(false)
    }
    setIsSearching(false)
    setSearchQuery('')
    setSearchParams({ tab: TABS[tab] }, { replace: true })
  }

  const handleOnResizeGrid = (sizes: number[]) => setTilesPerRow(sizes.length)

  const mappedTabs = TABS.map((tab) => ({ name: tab, badgeNumber: 0 }))

  const getChannelContent = (tab: typeof TABS[number]) => {
    switch (tab) {
      case 'Videos':
        return (
          <ChannelVideos
            tilesPerPage={tilesPerPage}
            onResize={handleOnResizeGrid}
            isSearching={isSearching}
            searchedText={searchedText}
            channelId={id || ''}
            foundVideos={foundVideos}
            loadingSearch={loadingSearch}
            sortVideosBy={sortVideosBy}
          />
        )
      case 'NFTs':
        return (
          <ChannelNfts
            isFiltersApplied={canClearAllFilters}
            tilesPerPage={tilesPerPage}
            orderBy={sortNftsBy}
            ownedNftWhereInput={ownedNftWhereInput}
            onResize={handleOnResizeGrid}
            channelId={id || ''}
          />
        )
      case 'Information':
        return <ChannelAbout channel={channel} />
    }
  }

  useEffect(() => {
    if (currentTabName) {
      setCurrentTab(currentTabName)
      setIsFiltersOpen(false)
      clearAllFilters()
    }
  }, [clearAllFilters, currentTabName, setIsFiltersOpen])
  const mappedChannelNftCollectors =
    channelNftCollectors?.map(({ amount, member }) => ({
      nftsAmount: amount,
      url: member?.metadata.avatar?.__typename === 'AvatarUri' ? member?.metadata.avatar?.avatarUri : '',
      tooltipText: member?.handle,
      onClick: () => navigate(absoluteRoutes.viewer.member(member?.handle)),
      memberUrl: absoluteRoutes.viewer.member(member?.handle),
    })) || []

  if (!loading && !channel) {
    return (
      <NotFoundChannelContainer>
        <EmptyFallback
          title="Channel not found"
          button={
            <Button variant="secondary" size="large" to={absoluteRoutes.viewer.index()}>
              Go back to home page
            </Button>
          }
        />
      </NotFoundChannelContainer>
    )
  }

  if (channelError || searchError) {
    return <ViewErrorFallback />
  }

  return (
    <ViewWrapper>
      {headTags}
      <ChannelCover assetUrl={coverPhotoUrl} />
      <LimitedWidthContainer>
        {smMatch ? (
          <CollectorsBoxContainer>
            {mappedChannelNftCollectors.length > 0 && <CollectorsBox collectors={mappedChannelNftCollectors} />}
          </CollectorsBoxContainer>
        ) : null}
        <TitleSection className={transitions.names.slide}>
          <StyledChannelLink id={channel?.id} avatarSize="channel" hideHandle noLink />
          <TitleContainer>
            {channel ? (
              <>
                <Text as="h1" variant={smMatch ? 'h700' : 'h600'}>
                  {channel.title}
                </Text>
                <SubTitle as="p" variant="t300" color="colorText">
                  {channel.follows ? (
                    <NumberFormat as="span" value={channel.follows} format="short" variant="t300" />
                  ) : (
                    0
                  )}{' '}
                  Followers
                </SubTitle>
              </>
            ) : (
              <>
                <TitleSkeletonLoader />
                <SubTitleSkeletonLoader />
              </>
            )}
          </TitleContainer>
          {smMatch || mappedChannelNftCollectors.length === 0 ? null : (
            <CollectorsBox collectors={mappedChannelNftCollectors} maxShowedCollectors={4} />
          )}
          <StyledButtonContainer>
            <StyledButton
              icon={isFollowing ? <SvgActionCheck /> : <SvgActionPlus />}
              variant={isFollowing ? 'secondary' : 'primary'}
              onClick={toggleFollowing}
              size="large"
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </StyledButton>
            <ContextMenu
              placement="bottom-end"
              items={[
                {
                  onClick: () => setShowReportDialog(true),
                  label: 'Report channel',
                  nodeStart: <SvgActionFlag />,
                },
              ]}
              trigger={<Button icon={<SvgActionMore />} variant="tertiary" size="large" />}
            />
            {channel?.id && (
              <ReportModal
                show={showReportDialog}
                onClose={() => setShowReportDialog(false)}
                entityId={channel?.id}
                type="channel"
              />
            )}
          </StyledButtonContainer>
        </TitleSection>
        <TabsWrapper isFiltersOpen={isFiltersOpen}>
          <TabsContainer tab={currentTab}>
            <StyledTabs
              selected={TABS.findIndex((x) => x === currentTab)}
              initialIndex={0}
              tabs={mappedTabs}
              onSelectTab={handleSetCurrentTab}
            />
            {currentTab !== 'Information' && (
              <>
                {currentTab === 'Videos' && (
                  <ChannelSearch
                    isSearchInputOpen={isSearchInputOpen}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    setIsSearchingInputOpen={setIsSearchingInputOpen}
                    setIsSearching={setIsSearching}
                    submitSearch={submitSearch}
                    isSearching={isSearching}
                  />
                )}
                <StyledSelect
                  size="medium"
                  inlineLabel="Sort by"
                  disabled={isSearching}
                  value={!isSearching ? (currentTab === 'Videos' ? sortVideosBy : sortNftsBy) : 0}
                  placeholder={isSearching ? 'Best match' : undefined}
                  items={!isSearching ? (currentTab === 'Videos' ? VIDEO_SORT_OPTIONS : NFT_SORT_OPTIONS) : []}
                  onChange={
                    !isSearching ? (currentTab === 'Videos' ? handleVideoSorting : handleNftSorting) : undefined
                  }
                />
                {currentTab === 'NFTs' && (
                  <FilterButton
                    badge={canClearAllFilters}
                    variant="secondary"
                    icon={<SvgActionFilters />}
                    onClick={toggleFilters}
                  >
                    {smMatch && 'Filters'}
                  </FilterButton>
                )}
              </>
            )}
          </TabsContainer>
          {currentTab === 'NFTs' && <FiltersBar {...filtersBarLogic} activeFilters={['nftStatus']} />}
        </TabsWrapper>
        {getChannelContent(currentTab)}
      </LimitedWidthContainer>
    </ViewWrapper>
  )
}
