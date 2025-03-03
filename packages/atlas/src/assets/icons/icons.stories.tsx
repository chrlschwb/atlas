import styled from '@emotion/styled'
import { Meta, Story } from '@storybook/react'

import { Text } from '@/components/Text'
import { cVar } from '@/styles'

import * as icons from './index'

export default {
  title: 'Icons/Icons',
} as Meta

const Template: Story = () => (
  <Container>
    {Object.entries(icons).map(([iconName, Component]) => {
      return (
        <Item key={iconName}>
          <Component />
          <Text as="span" color="colorText" variant="t100">
            {iconName}
          </Text>
        </Item>
      )
    })}
  </Container>
)

export const Default = Template.bind({})
Default.args = {}

const Container = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, max-content));
  flex-wrap: wrap;
  padding: 50px 0;
  justify-content: center;
`

const Item = styled.div`
  border: 1px solid ${cVar('colorCoreNeutral700')};
  flex: 1;
  padding: 32px 0;
  text-align: center;

  svg {
    margin: 0 auto;
    margin-bottom: 8px;
  }
`
