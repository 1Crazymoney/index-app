import { useEffect, useState } from 'react'

import { colors, useICColorMode } from 'styles/colors'

import { UpDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Flex,
  IconButton,
  Text,
  useDisclosure,
} from '@chakra-ui/react'
import { BigNumber } from '@ethersproject/bignumber'
import { ChainId, useEthers } from '@usedapp/core'

import ConnectModal from 'components/header/ConnectModal'
import { POLYGON } from 'constants/chains'
import {
  ExchangeIssuanceLeveragedAddress,
  ExchangeIssuanceZeroExAddress,
  zeroExRouterAddress,
} from 'constants/ethContractAddresses'
import {
  DefiPulseIndex,
  ETH,
  indexNamesMainnet,
  indexNamesPolygon,
  mainnetCurrencyTokens,
  polygonCurrencyTokens,
  Token,
} from 'constants/tokens'
import { useApproval } from 'hooks/useApproval'
import { useTokenBalance } from 'hooks/useTokenBalance'
import { useTrade } from 'hooks/useTrade'
import { displayFromWei, toWei } from 'utils'
import { useBestTradeOption } from 'utils/bestTradeOption'
import { ZeroExData } from 'utils/zeroExUtils'

import QuickTradeSelector from './QuickTradeSelector'
import TradeInfo, { TradeInfoItem } from './TradeInfo'

const QuickTrade = (props: {
  isNarrowVersion?: boolean
  singleToken?: Token
}) => {
  const { isDarkMode } = useICColorMode()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { account, chainId } = useEthers()

  /**
   * Get the list of currency tokens for the selected chain
   * @returns Token[] list of tokens
   */
  const getCurrencyTokensByChain = () => {
    if (chainId === POLYGON.chainId) return polygonCurrencyTokens
    return mainnetCurrencyTokens
  }

  /**
   * Get the list of currency tokens for the selected chain
   * @returns Token[] list of tokens
   */
  const getTokenListByChain = () => {
    const { singleToken } = props
    if (singleToken) return [singleToken]
    if (chainId === POLYGON.chainId) return indexNamesPolygon
    return indexNamesMainnet
  }

  const [hasInsufficientFunds, setHasInsufficientFunds] = useState(false)
  const [isBuying, setIsBuying] = useState<boolean>(true)
  const [buyToken, setBuyToken] = useState<Token>(DefiPulseIndex)
  const [buyTokenBalanceFormatted, setBuyTokenBalanceFormatted] = useState('0')
  const [buyTokenList, setBuyTokenList] = useState<Token[]>(
    getTokenListByChain()
  )
  const [sellToken, setSellToken] = useState<Token>(ETH)
  const [sellTokenAmount, setSellTokenAmount] = useState('0')
  const [sellTokenBalanceFormatted, setSellTokenBalanceFormatted] =
    useState('0')

  // const [buyTokenAmount, setBuyTokenAmount] = useState<string>('0')
  const [sellTokenList, setSellTokenList] = useState<Token[]>(
    getCurrencyTokensByChain()
  )
  const [isIssuance, setIsIssuance] = useState<boolean>(true)

  const sellTokenBalance = useTokenBalance(sellToken)
  const buyTokenBalance = useTokenBalance(buyToken)

  const {
    bestOptionResult,
    isFetchingTradeData,
    isLeveragedEI,
    isZeroExEI,
    fetchAndCompareOptions,
  } = useBestTradeOption()
  const bestOption = bestOptionResult?.success ? bestOptionResult.data : null
  const hasFetchingError =
    bestOptionResult && !bestOptionResult.success && !isFetchingTradeData
  const tradeInfoData: TradeInfoItem[] = getTradeInfoData(bestOption, chainId)

  const {
    isApproved: isApprovedForSwap,
    isApproving: isApprovingForSwap,
    onApprove: onApproveForSwap,
  } = useApproval(bestOption?.sellTokenAddress, zeroExRouterAddress)
  const {
    isApproved: isApprovedForEIL,
    isApproving: isApprovingForEIL,
    onApprove: onApproveForEIL,
  } = useApproval(
    bestOption?.sellTokenAddress,
    ExchangeIssuanceLeveragedAddress
  )
  const {
    isApproved: isApprovedForEIZX,
    isApproving: isApprovingForEIZX,
    onApprove: onApproveForEIZX,
  } = useApproval(bestOption?.sellTokenAddress, ExchangeIssuanceZeroExAddress)

  const { executeTrade, isTransacting } = useTrade(
    bestOptionResult?.success ? bestOptionResult.data : null
  )
  const buyTokenAmount = tradeInfoData[0]?.value ?? '0'

  /**
   * Switches sell token lists between mainnet and polygon
   */
  useEffect(() => {
    const sellTokenList = getCurrencyTokensByChain()
    const buyTokenList = getTokenListByChain()
    const sellToken = sellTokenList[0]
    const buyToken = buyTokenList[0]
    setSellTokenList(sellTokenList)
    setBuyTokenList(buyTokenList)
    setSellToken(sellToken)
    setBuyToken(buyToken)
  }, [chainId])

  useEffect(() => {
    if (isBuying) {
      setSellTokenList(getCurrencyTokensByChain())
      setBuyTokenList(getTokenListByChain())
      setIsIssuance(true)
    } else {
      setSellTokenList(getTokenListByChain())
      setBuyTokenList(getCurrencyTokensByChain())
      setIsIssuance(false)
    }
  }, [isBuying])

  useEffect(() => {
    const isUSDC = buyToken.symbol === 'USDC'
    const decimals = isUSDC ? 6 : 18
    const formattedBalance = buyTokenBalance
      ? displayFromWei(buyTokenBalance, 2, decimals) || '0.00'
      : '0.00'
    setBuyTokenBalanceFormatted(formattedBalance)
  }, [buyToken, buyTokenBalance])

  useEffect(() => {
    const isUSDC = sellToken.symbol === 'USDC'
    const decimals = isUSDC ? 6 : 18
    const formattedBalance = sellTokenBalance
      ? displayFromWei(sellTokenBalance, 2, decimals) || '0.00'
      : '0.00'
    setSellTokenBalanceFormatted(formattedBalance)
  }, [sellToken, sellTokenBalance])

  useEffect(() => {
    const sellAmount = toWei(sellTokenAmount, sellToken.decimals)

    if (
      bestOption === null ||
      sellAmount.isZero() ||
      sellAmount.isNegative() ||
      sellTokenBalance === undefined
    )
      return

    const hasInsufficientFunds = sellAmount.gt(sellTokenBalance)
    setHasInsufficientFunds(hasInsufficientFunds)
  }, [
    bestOption,
    sellTokenAmount,
    sellToken,
    buyToken,
    buyTokenAmount,
    sellTokenBalance,
  ])

  useEffect(() => {
    fetchOptions()
  }, [buyToken, buyTokenAmount, sellToken, sellTokenAmount])

  const fetchOptions = () => {
    const sellTokenInWei = toWei(sellTokenAmount, sellToken.decimals)
    // TODO: recheck logic later
    if (
      // BigNumber.from(buyTokenAmount).isZero() &&
      sellTokenInWei.isZero()
    )
      return
    fetchAndCompareOptions(
      sellToken,
      sellTokenAmount,
      buyToken,
      buyTokenAmount,
      isIssuance
    )
  }

  const getIsApproved = () => {
    if (isLeveragedEI) return isApprovedForEIL
    if (isZeroExEI) return isApprovedForEIZX
    return isApprovedForSwap
  }

  const getIsApproving = () => {
    if (isLeveragedEI) return isApprovingForEIL
    if (isZeroExEI) return isApprovingForEIZX
    return isApprovingForSwap
  }

  const getOnApprove = () => {
    if (isLeveragedEI) return onApproveForEIL()
    if (isZeroExEI) return onApproveForEIZX()
    return onApproveForSwap()
  }

  /**
   * Get the correct trade button label according to different states
   * @returns string label for trade button
   */
  const getTradeButtonLabel = () => {
    if (!account) {
      return 'Connect Wallet'
    }

    if (sellTokenAmount === '0') {
      return 'Enter an amount'
    }

    if (hasInsufficientFunds) {
      return 'Insufficient funds'
    }

    if (hasFetchingError) {
      return 'Try again'
    }

    const isNativeToken =
      sellToken.symbol === 'ETH' || sellToken.symbol === 'MATIC'

    if (!isNativeToken && getIsApproving()) {
      return 'Approving...'
    }

    if (!isNativeToken && !getIsApproved()) {
      return 'Approve Tokens'
    }

    if (isTransacting) return 'Trading...'

    return 'Trade'
  }

  /**
   * Sets the list of tokens based on if the user is buying or selling
   */
  const swapTokenLists = () => {
    setBuyToken(sellToken)
    setSellToken(buyToken)
    setIsBuying(!isBuying)
  }

  const onChangeSellTokenAmount = (input: string) => {
    const inputNumber = Number(input)
    if (input === sellTokenAmount || input.slice(-1) === '.') return
    if (isNaN(inputNumber) || inputNumber < 0) return
    setSellTokenAmount(inputNumber.toString())
  }

  const onChangeSellToken = (symbol: string) => {
    const filteredList = sellTokenList.filter(
      (token) => token.symbol === symbol
    )
    if (filteredList.length < 0) {
      return
    }
    setSellToken(filteredList[0])
  }

  const onChangeBuyToken = (symbol: string) => {
    const filteredList = buyTokenList.filter((token) => token.symbol === symbol)
    if (filteredList.length < 0) {
      return
    }
    setBuyToken(filteredList[0])
  }

  const onChangeBuyTokenAmount = (input: string) => {
    // const inputNumber = Number(input)
    // if (input === buyTokenAmount || input.slice(-1) === '.') return
    // if (isNaN(inputNumber) || inputNumber < 0) return
    // setBuyTokenAmount(inputNumber.toString())
  }

  const onClickTradeButton = async () => {
    if (!account) {
      // Open connect wallet modal
      onOpen()
      return
    }

    if (hasInsufficientFunds) return

    if (hasFetchingError) {
      fetchOptions()
      return
    }

    const isNativeToken =
      sellToken.symbol === 'ETH' || sellToken.symbol === 'MATIC'
    if (!getIsApproved() && !isNativeToken) {
      await getOnApprove()
      return
    }

    await executeTrade()
  }

  const isLoading = getIsApproving() || isFetchingTradeData

  const getButtonDisabledState = () => {
    if (!account) return false
    if (hasFetchingError) return false
    return buyTokenAmount === '0' || hasInsufficientFunds || isTransacting
  }

  const buttonLabel = getTradeButtonLabel()
  const isButtonDisabled = getButtonDisabledState()

  const isNarrow = props.isNarrowVersion ?? false
  const paddingX = isNarrow ? '16px' : '40px'

  return (
    <Flex
      border='2px solid #F7F1E4'
      borderColor={isDarkMode ? colors.icWhite : colors.black}
      borderRadius='16px'
      direction='column'
      py='20px'
      px={['16px', paddingX]}
    >
      <Flex>
        <Text fontSize='24px' fontWeight='700'>
          Quick Trade
        </Text>
      </Flex>
      <Flex direction='column' my='20px'>
        <QuickTradeSelector
          title='From'
          config={{
            isDarkMode,
            isInputDisabled: false,
            isSelectorDisabled: false,
            isReadOnly: false,
          }}
          selectedToken={sellToken}
          tokenList={sellTokenList}
          selectedTokenBalance={sellTokenBalanceFormatted}
          onChangeInput={onChangeSellTokenAmount}
          onSelectedToken={onChangeSellToken}
        />
        <Box h='12px' alignSelf={'flex-end'}>
          <IconButton
            background='transparent'
            margin={'6px 0'}
            aria-label='Search database'
            borderColor={isDarkMode ? colors.icWhite : colors.black}
            color={isDarkMode ? colors.icWhite : colors.black}
            icon={<UpDownIcon />}
            onClick={swapTokenLists}
          />
        </Box>
        <QuickTradeSelector
          title='To'
          config={{
            isDarkMode,
            isInputDisabled: true,
            isSelectorDisabled: false,
            isReadOnly: true,
          }}
          selectedToken={buyToken}
          selectedTokenAmount={buyTokenAmount}
          selectedTokenBalance={buyTokenBalanceFormatted}
          tokenList={buyTokenList}
          onChangeInput={onChangeBuyTokenAmount}
          onSelectedToken={onChangeBuyToken}
        />
      </Flex>
      <Flex direction='column'>
        {tradeInfoData.length > 0 && <TradeInfo data={tradeInfoData} />}
        {hasFetchingError && (
          <Text align='center' color={colors.icRed} p='16px'>
            Error fetching a quote.
          </Text>
        )}
        <TradeButton
          label={buttonLabel}
          background={isDarkMode ? colors.icWhite : colors.icYellow}
          isDisabled={isButtonDisabled}
          isLoading={isLoading}
          onClick={onClickTradeButton}
        />
      </Flex>
      <ConnectModal isOpen={isOpen} onClose={onClose} />
    </Flex>
  )
}

interface TradeButtonProps {
  label: string
  background: string
  isDisabled: boolean
  isLoading: boolean
  onClick: () => void
}

const TradeButton = (props: TradeButtonProps) => (
  <Button
    background={props.background}
    border='0'
    borderRadius='12px'
    color='#000'
    disabled={props.isDisabled}
    fontSize='24px'
    fontWeight='600'
    isLoading={props.isLoading}
    height='54px'
    w='100%'
    onClick={props.onClick}
  >
    {props.label}
  </Button>
)

function getTradeInfoData(
  zeroExTradeData: ZeroExData | undefined | null,
  chainId: ChainId = ChainId.Mainnet
): TradeInfoItem[] {
  if (zeroExTradeData === undefined || zeroExTradeData === null) return []

  const { gas, gasPrice, sources } = zeroExTradeData
  if (gasPrice === undefined || gas === undefined || sources === undefined)
    return []

  const minReceive = displayFromWei(zeroExTradeData.minOutput) ?? '0.0'

  const networkFee =
    displayFromWei(BigNumber.from(gasPrice).mul(BigNumber.from(gas))) ?? '-'
  const networkToken = chainId === ChainId.Polygon ? 'MATIC' : 'ETH'

  const offeredFromSources = zeroExTradeData.sources
    .filter((source) => Number(source.proportion) > 0)
    .map((source) => source.name)

  return [
    { title: 'Minimum Receive', value: minReceive },
    { title: 'Network Fee', value: `${networkFee} ${networkToken}` },
    { title: 'Offered From', value: offeredFromSources.toString() },
  ]
}

export default QuickTrade
