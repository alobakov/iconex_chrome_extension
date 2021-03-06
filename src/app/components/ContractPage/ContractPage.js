import React, { Component } from 'react';
import { ContractReadPage} from 'app/components/';


const INIT_STATE = {
  tab: 'read'
}

class ContractPage extends Component {

  constructor(props) {
    super(props);
    this.state = INIT_STATE
  }

  componentWillUnmount() {
    this.props.resetReducer();
  }

  setTab = (e) => {
    const target = e.target.getAttribute('data-name');
    this.setState({
      tab: target
    })
  }

  render() {
    const { tab } = this.state;
    return (
      <div>
        <div className="title-holder sub">
          <h1>컨트랙트</h1>
          <div className="tab-holder">
            <ul>
  						<li onClick={this.setTab} data-name={'read'} className={tab === 'read' ? 'on' : ''}>조회/실행하기</li>
  						{/*<li onClick={this.setTab} data-name={'deploy'} className={tab === 'deploy' ? 'on' : ''}>배포하기</li>*/}
  					</ul>
          </div>
        </div>
        <div className="wrap-holder contract">
          { tab === 'read' && (<ContractReadPage />)}

    		</div>
      </div>
    );
  }
}

export default ContractPage;
