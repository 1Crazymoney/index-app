import { StackDivider, VStack } from '@chakra-ui/layout'
import { Heading, Text } from '@chakra-ui/react'

interface PageTitleProps {
  title: string
  subtitle: string
}

const PageTitle = (props: PageTitleProps) => {
  return (
    <VStack
      divider={<StackDivider borderColor='white' />}
      spacing={0}
      align='flex-start'
    >
      <Heading as='h2' size='lg'>
        {props.title}
      </Heading>
      <Text>{props.subtitle}</Text>
    </VStack>
  )
}

export default PageTitle