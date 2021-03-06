import React, { Component } from 'react';
import { routeConstants as ROUTE, currencyUnit as CURRENCY_UNIT, dateFormat as DATE_FORMAT} from 'constants/index'
import { ICX_TOKEN_CONTRACT_ADDRESS } from 'constants/config'
import { LoadingComponent, Alert } from 'app/components/'
import { convertNumberToText } from 'utils'
import { withRouter } from 'react-router-dom'
import moment from 'moment';
import withLanguageProps from 'HOC/withLanguageProps';


@withRouter
@withLanguageProps
class WalletBar extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showAlertNoBalance: false,
      showAlertNoSwapBalance: false,
      showAlertNoSwapGasBalance: false
    }
  }

  handleClick = () => {
    const { data, history } = this.props;
    const { tokenId, account } = data;
    const url = tokenId ? account + '_' + tokenId : account;
    history.push(ROUTE['mywallet'] + '/' + url );
  }

  handleTransactionClick = () => {
    const { data, history } = this.props;
    const { account, balance, tokenId } = data;
    if (balance.eq(0)) {
      this.setState({
        showAlertNoBalance: true
      })
      return false;
    }
    this.props.setSelectedWallet({
      account,
      tokenId
    })
    history.push({
      pathname: ROUTE['transaction']
    });
    this.props.openPopup({
      popupType: 'sendTransaction_transaction'
    });
  }

  handleSwapClick = () => {
    const { data } = this.props;
    const { tokenId, balance, walletBalance, account } = data;

    if (balance.eq(0)) {
      this.setState({
        showAlertNoSwapBalance: true
      });
      return false;
    }

    if (walletBalance.eq(0)) {
      this.setState({
        showAlertNoSwapGasBalance: true
      });
      return false;
    }

    // this.props.setAccountAddress({
    //   isLoggedIn: false,
    //   accountAddress: account,
    //   coinTypeIndex: tokenId
    // })
    this.props.setSelectedWallet({
      account,
      tokenId
    })
    this.props.openPopup({
      popupType: 'swapToken'
    });
  }

  closeAlert = () => {
    this.setState({
      showAlertNoBalance: false,
      showAlertNoSwapBalance: false,
      showAlertNoSwapGasBalance: false
    })
  }

  render() {
    const { showAlertNoBalance, showAlertNoSwapBalance, showAlertNoSwapGasBalance } = this.state;
    const { currency, data, I18n } = this.props;
    const { name, balanceLoading = false, symbol, balance, recent, totalResultLoading, balanceWithRate, tokenId } = data;

    const balanceText = convertNumberToText(balance, symbol, true);
    const isSwapAvailable = tokenId === ICX_TOKEN_CONTRACT_ADDRESS()

    if (balanceLoading) {
      return (
        <tr>
          <td colSpan="5" className="load">
            <LoadingComponent type="black"/>
          </td>
        </tr>
      );
    } else {
      return (
        <tr>
          <td onClick={this.handleClick}>{name}</td>
          <td onClick={this.handleClick}><em>{balanceText}</em><span>{symbol.toUpperCase()}</span></td>
          <td onClick={this.handleClick}>
            {!totalResultLoading ? (
              <div>{balanceWithRate !== null && <i className="_img"></i>}<em>{balanceWithRate !== null ? convertNumberToText(balanceWithRate, currency, false) : "-"}</em><em>{CURRENCY_UNIT[currency]}</em></div>
            ) : (
              <div className="load">
                <LoadingComponent type="black"/>
              </div>
            )}
          </td>
          {
            recent.length > 0
              ? (<td onClick={this.handleClick}>{I18n.myWalletBarRecentTransaction}<span>{moment(recent[0].time).format(DATE_FORMAT)}</span></td>)
              : (<td className="no" onClick={this.handleClick}>{I18n.myWalletBarNoTransaction}</td>)
          }
          <td>
            {/* { !isToken && (
              <button disabled={true} className="btn-type-exchange"><span>{I18n.button.exchange}</span></button>
            )} */}
            {isSwapAvailable && <button onClick={this.handleSwapClick} className="btn-type-exchange"><span>{I18n.button.swap}</span></button>}
            <button onClick={this.handleTransactionClick} className="btn-type-exchange"><span>{I18n.button.transfer}</span></button>
          </td>
          {
            showAlertNoBalance && (
              <Alert
                handleCancel={this.closeAlert}
                text={I18n.error.alertNoBalance}
                cancelText={I18n.button.confirm}
              />
            )
          }
          {
            showAlertNoSwapBalance && (
              <Alert
                handleCancel={this.closeAlert}
                text={I18n.error.alertNoSwapBalance}
                cancelText={I18n.button.confirm}
              />
            )
          }
          {
            showAlertNoSwapGasBalance && (
              <Alert
                handleCancel={this.closeAlert}
                text={I18n.error.alertNoSwapGasBalance}
                cancelText={I18n.button.confirm}
              />
            )
          }
        </tr>
      )
    }
  }
}

export default WalletBar;
