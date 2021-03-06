import { chromeStorage } from 'utils';
import axios from 'axios';
import { signRawTx, customValueToTokenValue, makeIcxRawTx, checkHxPrefix, check0xPrefix, delete0xPrefix, randomUint32, isIRCTokenFunc } from 'utils';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import { ICX_WALLET_SERVER, ICX_TRACKER_SERVER, IS_V3 } from 'constants/config.js';

let walletApi = axios.create({
  baseURL: ICX_WALLET_SERVER(),
  headers: {
    'Content-Type': 'application/json',
  },
})

let trackerApi = axios.create({
  baseURL: ICX_TRACKER_SERVER(),
})

export function icx_fetchCoinBalanceApi(account) {
  let param = {
    jsonrpc:"2.0",
    method:"icx_getBalance",
    id: randomUint32(),
    params:{ "address": checkHxPrefix(account) },
  }
  return new Promise(resolve => {
    walletApi.post(`/api/v${IS_V3 ? '3' : '2'}`, JSON.stringify(param))
      .then(res => {
        resolve(window.web3.fromWei(new BigNumber(IS_V3 ? res.data.result : res.data.result.response), 'ether'))
      })
      .catch(error => {
        resolve(window.web3.fromWei(new BigNumber(0), 'ether'));
      })
  })
}

export function icx_fetchTokenBalanceApi(tokenAddress, customDecimal, account) {
  return (async () => {
      try {
        if (!IS_V3) {
          throw new Error('v2 version');
        }

        const balance = await icx_call({
          contractAddress: tokenAddress,
          methodName: 'balanceOf',
          inputObj: {
            _owner: checkHxPrefix(account)
          }
        });

        const balanceBigNumber = new BigNumber(balance[0]);
        let divisor = new BigNumber(10).toPower(customDecimal);
				const dividedBalance = balanceBigNumber.div(divisor);
        return dividedBalance

      } catch (e) {
        return window.web3.fromWei(new BigNumber(0), 'ether')
      }
    })();
}

export function icx_sendCoinApi(privKey, data) {
  return (async () => {
    const rawTx = makeIcxRawTx(false, data);
    const rawTxSigned = signRawTx(privKey, rawTx)
    const result = await icx_sendTransaction(rawTxSigned);
    return result
  })();
}

export function icx_sendTokenApi(privKey, data) {
  return (async () => {
    const sendAmount = customValueToTokenValue(new BigNumber(data.value), data.tokenDefaultDecimal, data.tokenDecimal).times(Math.pow(10, data.tokenDefaultDecimal)).toString();
    const newData = Object.assign({}, data, {
      methodName: 'transfer',
      inputObj: {
        "_to": data.to,
        "_value": window.web3.toHex(sendAmount)
      }
    })
    const rawTx = makeIcxRawTx(true, newData);
    const rawTxSigned = signRawTx(privKey, rawTx)
    const result = await icx_sendTransaction(rawTxSigned);
    return result;
  })();
}


export function icx_fetchTransactionHistoryApi(data) {
  if (data.isPending) {
    return new Promise(resolve => {
      chromeStorage.get(data.account, (result) => {
          const newArr = data.pendingList.filter(function(e){return e});
          if (data.contractAddress) {
            result[data.account].tokens[data.contractAddress].pendingTransaction = newArr;
          } else {
            result[data.account].pendingTransaction = newArr;
          }
          chromeStorage.set(result, () => {
              resolve({
                data: newArr
              });
          });
      });
    });
  } else {
    const _addressId = data.account || '';
    const _pageId = data.page || 1;
    return new Promise(resolve => {
      if (IS_V3) {
        const url = data.contractAddress ? `/v3/token/txList?tokenAddr=${_addressId}&page=${_pageId}&contractAddr=${data.contractAddress}`
                                         : `/v3/address/txList?address=${_addressId}&page=${_pageId}&type=0`
        trackerApi.get(url)
          .then(res => {
            resolve({
              data: res.data.data,
              total: res.data.listSize || 0
            })
          })
          .catch(error => {
            console.log(error)
            resolve({
              data: [],
              total: 0
            })
          })
      } else {
        trackerApi.get('/v0/wallet/walletDetailTxList?address=' + _addressId + '&page=' + _pageId)
          .then(res => {
            resolve({
              data: res.data.data.walletTx || [],
              total: res.data.totalData || 0
            })
          })
          .catch(error => {
            resolve({
              data: [],
              total: 0
            })
          })
      }
    })
  }
}

export function icx_checkIcxTransactionExist(data) {

  return new Promise(resolve => {
    if (moment() > moment(data.time).add(10, 'minutes')) {
      console.log('here')
      resolve('')
    }
    if (IS_V3) {
      let param = {
        jsonrpc:"2.0",
        method:"icx_getTransactionResult",
        id: randomUint32(),
        params:{ "txHash": check0xPrefix(data.txid) },
      }
      walletApi.post('/api/v3', JSON.stringify(param))
        .then(res => {
          // success
          console.log(res)
          if (res.data.result.status === "0x1") {
            resolve('');
          // failure
          } else if (res.data.result.status === "0x0") {
            resolve(Object.assign({}, data, {
              isFail: true
            }));
          } else {
            resolve(data);
          }
        })
        .catch(error => {
          if (!data['txid']) {
            resolve('');
          } else {
            console.log('maybe')
            resolve(data);
          }
        })
    } else {
      let param = {
        jsonrpc:"2.0",
        method:"icx_getTransactionResult",
        id: randomUint32(),
        params:{ "tx_hash": delete0xPrefix(data.txid) },
      }
      walletApi.post('/api/v2', JSON.stringify(param))
        .then(res => {
          if (res.data.result.response_code === "0" && res.data.result.response.code === 0) {
            resolve('');
          } else {
            if (moment() > moment(data.time).add(10, 'minutes')) {
              resolve('')
            } else {
              resolve(data);
            }
          }
        })
        .catch(error => {
          if (!data['txid']) {
            resolve('');
          } else {
            resolve(data);
          }
        })
    }
  })
}

export function icx_getTokenInfoApi(tokenObj) {
  return (async () => {
      try {
        const tokenFuncList = await icx_getScoreApi(tokenObj.address);
        console.log(JSON.stringify(tokenFuncList))
        if (!isIRCTokenFunc(tokenFuncList)) {
          throw new Error('notIRCToken');
        }
        const getNameObj = tokenFuncList.filter(obj => obj.name === 'name');
        console.log(getNameObj)
        const name = await icx_call({
          contractAddress: tokenObj.address,
          methodName: getNameObj[0].name,
          inputObj: {}
        });
        const getSymbolObj = tokenFuncList.filter(obj => obj.name === 'symbol');
        const symbol = await icx_call({
          contractAddress: tokenObj.address,
          methodName: getSymbolObj[0].name,
          inputObj: {}
        });
        const getDecimalsObj = tokenFuncList.filter(obj => obj.name === 'decimals');
        const decimals = await icx_call({
          contractAddress: tokenObj.address,
          methodName: getDecimalsObj[0].name,
          inputObj: {}
        });
        const result = Object.assign({}, tokenObj, {
          defaultName: name[0],
          defaultSymbol: symbol[0],
          defaultDecimals: parseInt(decimals[0], 16),
          recent: [],
          pendingTransaction: [],
          createdAt: Date.now().toString()
        })
        return {
          result
        };
      } catch (error) {
        return {
          error
        };
      }
    })();
}

export function icx_call({
  contractAddress,
  methodName,
  inputObj
} = {}) {
  return new Promise((resolve, reject) => {
    let param = {
       "jsonrpc": "2.0",
       "method": "icx_call",
       "id": randomUint32(),
       "params": {
         "from": "hxbe258ceb872e08851f1f59694dac2558708ece11",
           "to": contractAddress,
           "dataType": "call",
           "data": {
               "method": methodName,
               "params": inputObj
           }
       }
    }

    walletApi.post(`/api/v3`, JSON.stringify(param))
      .then(res => {
        if(res.data.result) {
          let result = res.data.result;
          resolve(!Array.isArray(result) ? [result] : result)
        } else {
            throw new Error(res.data.error);
        }
      })
      .catch(error => {
        reject(error);
      })
  });
}

export function icx_sendTransaction(rawTx) {
  if (IS_V3) {
    return new Promise((resolve, reject) => {
      let param = {
        jsonrpc:"2.0",
        method:"icx_sendTransaction",
        params: rawTx,
        id: randomUint32()
      }

      walletApi.post(`/api/v3`, JSON.stringify(param))
        .then(res => {
          resolve (res.data.result);
        })
        .catch((error) => {
          reject (error.response.data.error);
        })
      });
  } else {
    return new Promise((resolve, reject) => {
      let param = {
        jsonrpc:"2.0",
        method:"icx_sendTransaction",
        params: rawTx,
        id: randomUint32()
      }
      walletApi.post(`/api/v2`, JSON.stringify(param))
        .then(res => {
          if(res.data.result['response_code'] === 0) {
              resolve(res.data.result.tx_hash);
          } else {
              resolve(res.data.result);
          }
        })
        .catch(error => {
          resolve(error);
        })
    });
  }
}

export function icx_getScoreApi(address) {
  return new Promise((resolve, reject) => {
    let param = {
      jsonrpc:"2.0",
      method:"icx_getScoreApi",
      params: {
        address
      },
      id: randomUint32()
    }

    walletApi.post(`/api/v3`, JSON.stringify(param))
      .then(res => {
        if(res.data.result) {
          resolve(res.data.result);
        } else {
          throw new Error(res.data.error);
        }
      })
      .catch(error => {
        reject(error);
      })
  });
}
