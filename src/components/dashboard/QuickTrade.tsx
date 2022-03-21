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
import {
  ChainId,
  useEtherBalance,
  useEthers,
  useTokenBalance,
} from '@usedapp/core'

import ConnectModal from 'components/header/ConnectModal'
import { POLYGON } from 'constants/chains'
import {
  ExchangeIssuanceLeveragedAddress,
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
import { useTrade } from 'hooks/useTrade'
import { displayFromWei, getChainAddress, toWei } from 'utils'
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
  const [buyTokenList, setBuyTokenList] = useState<Token[]>(
    getTokenListByChain()
  )
  const [sellToken, setSellToken] = useState<Token>(ETH)
  const [sellTokenAmount, setSellTokenAmount] = useState<string>('0')
  // const [buyTokenAmount, setBuyTokenAmount] = useState<string>('0')
  const [sellTokenList, setSellTokenList] = useState<Token[]>(
    getCurrencyTokensByChain()
  )
  const [isIssuance, setIsIssuance] = useState<boolean>(true)

  const etherBalance = useEtherBalance(account)
  const sellTokenBalance = useTokenBalance(
    getChainAddress(sellToken, chainId),
    account
  )

  const { bestOption, isFetchingTradeData, fetchAndCompareOptions } =
    useBestTradeOption()
  const tradeInfoData: TradeInfoItem[] = getTradeInfoData(bestOption, chainId)

  const {
    isApproved: isApproveForSwap,
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
  const { executeTrade } = useTrade(bestOption)

  const buyTokenAmount = tradeInfoData[0]?.value ?? '0'

  /**
   * Switches sell token lists between mainnet and polygon
   */
  useEffect(() => {
    setSellTokenList(getCurrencyTokensByChain())
    setBuyTokenList(getTokenListByChain())
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
    const sellAmount = toWei(sellTokenAmount, sellToken.decimals)
    const sellBalance =
      sellToken.symbol === 'ETH' ? etherBalance : sellTokenBalance

    if (
      bestOption === undefined ||
      sellAmount.isZero() ||
      sellAmount.isNegative() ||
      sellBalance === undefined
    )
      return

    const hasInsufficientFunds = sellAmount.gt(sellBalance)
    setHasInsufficientFunds(hasInsufficientFunds)
  }, [
    bestOption,
    sellTokenAmount,
    sellToken,
    buyToken,
    buyTokenAmount,
    etherBalance,
    sellTokenBalance,
  ])

  useEffect(() => {
    const sellTokenInWei = toWei(sellTokenAmount)
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
  }, [buyToken, buyTokenAmount, sellToken, sellTokenAmount])

  /**
   * Get the correct trade button label according to different states
   * @returns string label for trade button
   */
  const getTradeButtonLabel = () => {
    if (!account) {
      return 'Connect Wallet'
    }

    if (buyTokenAmount === '0') {
      return 'Enter an amount'
    }

    if (hasInsufficientFunds) {
      return 'Insufficient funds'
    }

    const isNativeToken =
      sellToken.symbol === 'ETH' || sellToken.symbol === 'MATIC'
    if (!isApproveForSwap && !isNativeToken) {
      return 'Approve Tokens'
    }

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

    const isNativeToken =
      sellToken.symbol === 'ETH' || sellToken.symbol === 'MATIC'
    if (!isApproveForSwap && !isNativeToken) {
      await onApproveForSwap()
      return
    }

    await executeTrade()
  }

  const isLoading = isApprovingForSwap || isFetchingTradeData

  const buttonLabel = getTradeButtonLabel()
  const isButtonDisabled = !account
    ? false
    : buyTokenAmount === '0' || hasInsufficientFunds || isApprovingForSwap

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
          tokenList={buyTokenList}
          onChangeInput={onChangeBuyTokenAmount}
          onSelectedToken={onChangeBuyToken}
        />
      </Flex>
      <Flex direction='column'>
        {tradeInfoData.length > 0 && <TradeInfo data={tradeInfoData} />}
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
