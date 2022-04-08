import { BigNumber, Contract, Signer } from 'ethers'

import { Provider } from '@ethersproject/abstract-provider'
import { ChainId } from '@usedapp/core'

import {
  ExchangeIssuanceLeveragedMainnetAddress,
  ExchangeIssuanceLeveragedPolygonAddress,
} from 'constants/ethContractAddresses'
import { getERC20Contract } from 'utils'
import { EI_LEVERAGED_ABI } from 'utils/abi/EILeveraged'

/**
 * returns instance of ExchangeIssuanceLeveraged Contract
 * @param providerSigner
 * @param chainId         chainId for contract (default Polygon since this where
 *                        the contract is mostly used)
 * @returns EI contract
 */
export const getExchangeIssuanceLeveragedContract = async (
  providerSigner: Signer | Provider | undefined,
  chainId: ChainId = ChainId.Polygon
): Promise<Contract> => {
  const contractAddress =
    chainId === ChainId.Polygon
      ? ExchangeIssuanceLeveragedPolygonAddress
      : ExchangeIssuanceLeveragedMainnetAddress
  return new Contract(contractAddress, EI_LEVERAGED_ABI, providerSigner)
}

/**
 * Returns the collateral / debt token addresses and amounts for a leveraged index
 *
 * @param library               library from logged in user
 * @param setToken              Address of the SetToken to be issued / redeemed
 * @param setAmount             Amount of SetTokens to issue / redeem
 * @param isIssuance            Boolean indicating if the SetToken is to be issued or redeemed
 *
 * @return Struct containing the collateral / debt token addresses and amounts
 */
export const getLeveragedTokenData = async (
  contract: Contract,
  setToken: string,
  setAmount: BigNumber,
  isIssuance: boolean
): Promise<any> => {
  console.log('getLeveragedTokenData')
  try {
    return await contract.getLeveragedTokenData(setToken, setAmount, isIssuance)
  } catch (err) {
    console.error('Error getting leveraged token data', err)
  }
}

/**
 * Get the 0x Trade Data for
 */
export const useExchangeIssuanceLeveraged = () => {
  /**
   * Trigger issuance of set token paying with any arbitrary ERC20 token
   *
   * @param library                       library from logged in user
   * @param chainId                       chain ID of current network | Mainnet
   * @param _setToken                     Set token to issue
   * @param _setAmount                    Amount to issue
   * @param _swapDataDebtForCollateral    Data (token addresses and fee levels) to describe the swap path from Debt to collateral token
   * @param _swapDataInputToken           Data (token addresses and fee levels) to describe the swap path from eth to collateral token
   */

  const issueExactSetFromETH = async (
    library: any,
    chainId: ChainId = ChainId.Mainnet,
    _setToken: string,
    _setAmount: BigNumber,
    _swapDataDebtForCollateral: any,
    _swapDataInputToken: any,
    _maxInput: BigNumber
  ): Promise<any> => {
    console.log('issueExactSetFromETH')
    try {
      const eiContract = await getExchangeIssuanceLeveragedContract(
        library.getSigner(),
        chainId
      )
      console.log('params', {
        _setToken,
        _setAmount,
        _swapDataDebtForCollateral,
        _swapDataInputToken,
        _maxInput,
      })

      //TODO: Estimate better _maxInput.
      //For now hardcode addtional 0.50% so it doesn't revert
      //Previously 0.25% was tried and was not enough
      //Ex. https://etherscan.io/tx/0x23d28156d8564dd775013241b27745a43e0923fe2e00c784349fff404fc043ac
      const higherMax = BigNumber.from(_maxInput).mul(10050).div(10000)
      console.log('amounts', _maxInput, higherMax)
      const issueSetTx = await eiContract.issueExactSetFromETH(
        _setToken,
        _setAmount,
        _swapDataDebtForCollateral,
        _swapDataInputToken,
        { value: higherMax, gasLimit: 1800000 }
      )

      return issueSetTx
    } catch (err) {
      console.log('error', err)
      return err
    }
  }

  /**
   * Trigger redemption of set token to pay the user with Eth
   *
   * @param library                     library from logged in user
   * @param _setAmount                  Amount to redeem
   * @param _minAmountOutputToken       Minimum amount of ETH to send to the user
   * @param _swapDataCollateralForDebt  Data (token path and fee levels) describing the swap from Collateral Token to Debt Token
   * @param _swapDataOutputToken        Data (token path and fee levels) describing the swap from Collateral Token to Eth
   */
  const redeemExactSetForETH = async (
    contract: Contract,
    _setToken: string,
    _setAmount: BigNumber,
    _minAmountOutputToken: BigNumber,
    _swapDataCollateralForDebt: any,
    _swapDataOutputToken: any
  ): Promise<any> => {
    console.log('redeemExactSetForETH')
    try {
      //TODO: Estimate better _minAmountOutputToken. For now hardcode addtional 0.05 ETH
      console.log('redeeming', {
        _setToken,
        _setAmount,
        _minAmountOutputToken,
        _swapDataCollateralForDebt,
        _swapDataOutputToken,
      })
      const redeemSetTx = await contract.redeemExactSetForETH(
        _setToken,
        _setAmount,
        _minAmountOutputToken,
        _swapDataCollateralForDebt,
        _swapDataOutputToken,
        { gasLimit: 1800000 }
      )
      return redeemSetTx
    } catch (err) {
      console.log('error', err)
      return err
    }
  }

  /**
   * Trigger issuance of set token paying with any arbitrary ERC20 token
   *
   * @param library                       library from logged in user
   * @param chainId                       chain ID of current network | Mainnet
   * @param _setToken                     Set token to issue
   * @param _setAmount                    Amount to issue
   * @param _inputToken                   Input token to pay with
   * @param _maxAmountInputToken          Maximum amount of input token to spend
   * @param _swapDataDebtForCollateral    Data (token addresses and fee levels) to describe the swap path from Debt to collateral token
   * @param _swapDataInputToken           Data (token addresses and fee levels) to describe the swap path from input to collateral token
   */
  const issueExactSetFromERC20 = async (
    library: any,
    chainId: ChainId = ChainId.Mainnet,
    _setToken: string,
    _setAmount: BigNumber,
    _inputToken: string,
    _maxAmountInputToken: BigNumber,
    _swapDataDebtForCollateral: any,
    _swapDataInputToken: any
  ): Promise<any> => {
    console.log('issueExactSetFromERC20', chainId)
    try {
      const eiContract = await getExchangeIssuanceLeveragedContract(
        library.getSigner(),
        chainId
      )
      // TODO: calculate more accurate _maxAmountInputToken so it doesn't revert
      const higherMax = BigNumber.from(_maxAmountInputToken)
        .mul(10050)
        .div(10000) // Extra 0.50%
      console.log('erc20', {
        _setToken,
        _setAmount,
        _inputToken,
        _maxAmountInputToken,
        _swapDataDebtForCollateral,
        _swapDataInputToken,
      })
      const issueSetTx = await eiContract.issueExactSetFromERC20(
        _setToken,
        _setAmount,
        _inputToken,
        higherMax, // TODO: Replace this with the proper _maxAmountInputToken
        _swapDataDebtForCollateral,
        _swapDataInputToken,
        {
          gasLimit: 1800000,
        }
      )
      return issueSetTx
    } catch (err) {
      console.log('error', err)
      return err
    }
  }

  /**
   * Trigger redemption of set token to pay the user with an arbitrary ERC20
   *
   * @param library                     library from logged in user
   * @param _setToken                   Set token to redeem
   * @param _setAmount                  Amount to redeem
   * @param _outputToken                Address of the ERC20 token to send to the user
   * @param _minAmountOutputToken       Minimum amount of output token to send to the user
   * @param _swapDataCollateralForDebt  Data (token path and fee levels) describing the swap from Collateral Token to Debt Token
   * @param _swapDataOutputToken        Data (token path and fee levels) describing the swap from Collateral Token to Output token
   */
  const redeemExactSetForERC20 = async (
    contract: Contract,
    _setToken: string,
    _setAmount: BigNumber,
    _outputToken: string,
    _minAmountOutputToken: BigNumber,
    _swapDataCollateralForDebt: any,
    _swapDataOutputToken: any
  ): Promise<any> => {
    console.log('redeemExactSetForERC20')
    try {
      // TODO: calculate a slightly higher _maxAmountInputToken so it doesn't revert
      const higherMax = BigNumber.from(_setAmount).mul(BigNumber.from(2))

      const redeemSetTx = await contract.redeemExactSetForERC20(
        _setToken,
        higherMax, // TODO: Replace this with the proper setAmount
        _outputToken,
        _minAmountOutputToken,
        _swapDataCollateralForDebt,
        _swapDataOutputToken,
        {
          gasLimit: 2000000,
          maxFeePerGas: 100000000000,
          maxPriorityFeePerGas: 2000000000,
        }
      )
      return redeemSetTx
    } catch (err) {
      console.log('error', err)
      return err
    }
  }

  /**
   * Gets the input cost of issuing a given amount of a set token. This
   * function is not marked view, but should be static called from frontends.
   * This constraint is due to the need to interact with the Uniswap V3 quoter
   * contract and call sync on AaveLeverageModule. Note: If the two SwapData
   * paths contain the same tokens, there will be a slight error introduced
   * in the result.
   *
   * @param setToken                     the set token to issue
   * @param setAmount                    amount of set tokens
   * @param _swapDataCollateralForDebt   swap data for the debt to collateral swap
   * @param _swapDataOutputToken         swap data for the input token to collateral swap
   *
   * @return                             the amount of input tokens required to perfrom the issuance
   */
  const getIssueExactSet = async (
    library: any,
    setToken: string,
    setAmount: BigNumber,
    _swapDataCollateralForDebt: any,
    _swapDataOutputToken: any
  ): Promise<any> => {
    console.log('getIssueExactSet')
    try {
      const eiContract = await getExchangeIssuanceLeveragedContract(
        library.getSigner()
      )
      const redeemQuoteTx = await eiContract.getRedeemExactSet(
        setToken,
        setAmount,
        _swapDataCollateralForDebt,
        _swapDataOutputToken
      )
      return redeemQuoteTx
    } catch (err) {
      console.log('error', err)
      return err
    }
  }

  /**
   * Gets the proceeds of a redemption of a given amount of a set token. This
   * function is not marked view, but should be static called from frontends.
   * This constraint is due to the need to interact with the Uniswap V3 quoter
   * contract and call sync on AaveLeverageModule. Note: If the two SwapData
   * paths contain the same tokens, there will be a slight error introduced
   * in the result.
   *
   * @param library                      library from logged in user
   * @param setToken                     the set token to issue
   * @param setAmount                    amount of set tokens
   * @param _swapDataCollateralForDebt   swap data for the collateral to debt swap
   * @param _swapDataOutputToken         swap data for the collateral token to the output token
   *
   * @return                             amount of _outputToken that would be obtained from the redemption
   */
  const getRedeemExactSet = async (
    library: any,
    setToken: string,
    setAmount: BigNumber,
    _swapDataCollateralForDebt: any,
    _swapDataOutputToken: any
  ): Promise<any> => {
    console.log('getRedeemExactSet')
    try {
      const eiContract = await getExchangeIssuanceLeveragedContract(
        library.getSigner()
      )
      const redeemQuoteTx = await eiContract.getRedeemExactSet(
        setToken,
        setAmount,
        _swapDataCollateralForDebt,
        _swapDataOutputToken
      )
      return redeemQuoteTx
    } catch (err) {
      console.log('error', err)
      return err
    }
  }

  /**
   * Runs all the necessary approval functions required before issuing or redeeming a SetToken.
   * This function need to be called only once before the first time this smart contract is used on any particular SetToken.
   *
   * @param library                library from logged in user
   * @param setToken               Address of the SetToken being initialized
   *
   */
  const approveSetToken = async (
    library: any,
    setToken: string
  ): Promise<any> => {
    console.log('approveSetToken')
    try {
      const eiContract = await getExchangeIssuanceLeveragedContract(
        library.getSigner()
      )
      const approveSetTokenTx = await eiContract.approveSetToken(setToken)
      return approveSetTokenTx
    } catch (err) {
      console.log('error', err)
      return err
    }
  }

  /**
   * Runs all the necessary approval functions required for a given ERC20 token.
   * This function can be called when a new token is added to a SetToken during a rebalance.
   *
   * @param library                library from logged in user
   * @param token                  Address of the token which needs approval
   *
   */
  const approveToken = async (library: any, token: string): Promise<any> => {
    console.log('approveToken')
    try {
      const eiContract = await getExchangeIssuanceLeveragedContract(
        library.getSigner()
      )
      const approveTokenTx = await eiContract.approveToken(token)
      return approveTokenTx
    } catch (err) {
      console.log('error', err)
      return err
    }
  }

  /**
   * Runs all the necessary approval functions required for a list of ERC20 tokens.
   *
   * @param library                library from logged in user
   * @param tokens                 Addresses of the tokens which needs approval
   *
   */
  const approveTokens = async (
    library: any,
    tokens: string[]
  ): Promise<any> => {
    console.log('approveTokens')
    try {
      const eiContract = await getExchangeIssuanceLeveragedContract(
        library.getSigner()
      )
      const approveTokensTx = await eiContract.approveTokens(tokens)
      return approveTokensTx
    } catch (err) {
      console.log('error', err)
      return err
    }
  }

  /**
   * Returns the tokenAllowance of a given token for a ExchangeIssuanceZeroEx contract.
   * @param account                Address of the account
   * @param library                library from logged in user
   * @param tokenAddress           Address of the token
   *
   * @return tokenAllowance        Token allowance of the account
   */
  const tokenAllowance = async (
    account: any,
    library: any,
    tokenAddress: string
  ): Promise<BigNumber> => {
    try {
      const tokenContract = await getERC20Contract(
        library.getSigner(),
        tokenAddress
      )
      const allowance = await tokenContract.allowance(
        account,
        ExchangeIssuanceLeveragedPolygonAddress
      )
      return BigNumber.from(allowance)
    } catch (err) {
      console.log('error', err)
      return BigNumber.from(0)
    }
  }

  return {
    issueExactSetFromETH,
    redeemExactSetForETH,
    issueExactSetFromERC20,
    redeemExactSetForERC20,
    getLeveragedTokenData,
    getIssueExactSet,
    getRedeemExactSet,
    approveSetToken,
    approveToken,
    approveTokens,
    tokenAllowance,
  }
}
