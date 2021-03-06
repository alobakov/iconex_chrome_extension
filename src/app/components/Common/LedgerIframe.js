import React, { Component } from 'react';
import { LEDGER_SERVER } from 'constants/config'
import queryString from 'query-string'

const INIT_STATE = {
  error: ''
}

class LedgerIframe extends Component {

  constructor(props) {
    super(props);
    this.state = INIT_STATE;
  }

  componentDidMount() {
    window.addEventListener('message', this.eventHandler);
  }

  componentWillUnmount() {
    window.removeEventListener('message', this.eventHandler);
  }

  shouldComponentUpdate(nextProps) {
    if (this.props.isHidden !== nextProps.isHidden) {
      return true
    }
    return false;
  }

  eventHandler = async (event) => {
    const {
      handleSuccess,
      handleError
    } = this.props;
    const { data } = event
    const parsedData = JSON.parse(data)
    const { error } = parsedData

    if (!error) {
      handleSuccess(event);
    } else {
      handleError(error);
    }
  }

  render() {
    const { isHidden, method, query, path, language } = this.props;

    const queryToString = query ? `&${queryString.stringify(query)}` : ''
    const pathString = path ? `&path=${path}` : ''
    const langString = `&lang=${language}`
    return (
      <iframe
        title="ICONex Ledger"
        scrolling="no"
        src={`${LEDGER_SERVER}?method=${method}${langString}${pathString}${queryToString || ''}`}
        style={
          isHidden ? {
            width: '0px',
            height: '0px',
          } : {
            width: '960px',
            height: '363px',
          }
        }
      />
    )
  }
}

export default LedgerIframe;
