import { useEffect, useState } from 'react'

import { Box, Flex, Link, Text } from '@chakra-ui/react'

import AllocationChart from 'components/dashboard/AllocationChart'
import { ChartTypeSelector } from 'components/dashboard/ChartTypeSelector'
import QuickTrade from 'components/dashboard/QuickTrade'
import { assembleHistoryItems } from 'components/dashboard/TransactionHistoryItems'
import TransactionHistoryTable, {
  TransactionHistoryItem,
} from 'components/dashboard/TransactionHistoryTable'
import Page from 'components/Page'
import PageTitle from 'components/PageTitle'
import MarketChart, { PriceChartData } from 'components/product/MarketChart'
import { getPriceChartData } from 'components/product/PriceChartData'
import SectionTitle from 'components/SectionTitle'
import { useUserBalances } from 'hooks/useUserBalances'
import {
  TokenMarketDataValues,
  useMarketData,
} from 'providers/MarketData/MarketDataProvider'
import { getTransactionHistory } from 'utils/alchemyApi'

import { getPieChartPositions, QuickTradeData } from './DashboardData'

const DownloadCsvView = () => {
  return (
    <Link href={''} isExternal>
      <Text style={{ color: '#B9B6FC' }}>Download CSV</Text>
    </Link>
  )
}

const Dashboard = () => {
  const { bed, data, dpi, mvi, gmi, btcfli, ethfli, ethflip } = useMarketData()
  const { userBalances, totalBalanceInUSD, totalHourlyPrices, priceChanges } =
    useUserBalances()

  const [historyItems, setHistoryItems] = useState<TransactionHistoryItem[]>([])
  const [priceChartData, setPriceChartData] = useState<PriceChartData[][]>([])

  useEffect(() => {
    // Set only if chart data wasn't set yet e.g. by using chart type selector
    if (totalHourlyPrices.length < 1 || priceChartData.length > 0) {
      return
    }
    const balanceData = getPriceChartData([{ hourlyPrices: totalHourlyPrices }])
    setPriceChartData(balanceData)
  }, [totalHourlyPrices])

  // FIXME: re-add once app is going live
  // useEffect(() => {
  //   if (account === null || account === undefined) return
  //   const fetchHistory = async () => {
  //     const transactions = await getTransactionHistory(account)
  //     const historyItems = assembleHistoryItems(transactions)
  //     setHistoryItems(historyItems)
  //   }
  //   fetchHistory()
  // }, [account])

  const balancesPieChart = userBalances.map((userTokenBalance) => ({
    title: userTokenBalance.symbol,
    value: userTokenBalance.balance,
  }))
  const pieChartPositions = getPieChartPositions(balancesPieChart)

  const top4Positions = pieChartPositions
    .filter((pos) => pos.title !== 'OTHERS')
    .flatMap((pos) => pos.title)
    .slice(0, 4)

  const allocationsChartData: TokenMarketDataValues[] = top4Positions
    .map((positionTitle) => {
      switch (positionTitle) {
        case 'DPI':
          return dpi
        case 'MVI':
          return mvi
        case 'DATA':
          return data

        case 'BED':
          return bed
        case 'GMI':
          return gmi
        case 'ETH2x-FLI':
          return ethfli
        case 'ETH2x-FLI-P':
          return ethflip
        case 'BTC2x-FLI':
          return btcfli
        default:
          return undefined
      }
    })
    // Remove undefined
    .filter((tokenData): tokenData is TokenMarketDataValues => !!tokenData)

  const onChangeChartType = (type: number) => {
    switch (type) {
      case 0: {
        const balanceData = getPriceChartData([
          { hourlyPrices: totalHourlyPrices },
        ])
        setPriceChartData(balanceData)
        break
      }
      case 1: {
        const allocationsData = getPriceChartData(allocationsChartData)
        setPriceChartData(allocationsData)
        break
      }
    }
  }

  const formattedPrice = `$${totalBalanceInUSD.toFixed(2).toString()}`
  const prices = [formattedPrice]
  // ['+10.53 ( +5.89% )', '+6.53 ( +2.89% )', ...]
  const priceChangesFormatted = priceChanges.map((change) => {
    const plusOrMinus = change.isPositive ? '+' : '-'
    return `${plusOrMinus}$${change.abs.toFixed(
      2
    )} ( ${plusOrMinus} ${change.rel.toFixed(2)}% )`
  })

  const width = 1096

  return (
    <Page>
      <Box w={width} mx='auto'>
        <PageTitle title='My Dashboard' subtitle='' />
        <Box my={12}>
          <MarketChart
            marketData={priceChartData}
            prices={prices}
            priceChanges={priceChangesFormatted}
            options={{
              width,
              hideYAxis: false,
            }}
            customSelector={<ChartTypeSelector onChange={onChangeChartType} />}
          />
          <Flex direction='row' mt='64px'>
            <Flex direction='column' grow='1' flexBasis='0'>
              <AllocationChart positions={pieChartPositions} />
            </Flex>
            <Box w='24px' />
            <Flex direction='column' grow='1' flexBasis='0'>
              <QuickTrade
                tokenList1={QuickTradeData.tokenList1}
                tokenList2={QuickTradeData.tokenList2}
              />
            </Flex>
          </Flex>
        </Box>
        <Box>
          <SectionTitle
            title='Transaction History'
            itemRight={<DownloadCsvView />}
          />
          <TransactionHistoryTable items={historyItems} />
        </Box>
      </Box>
    </Page>
  )
}

export default Dashboard