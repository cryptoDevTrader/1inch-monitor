'use strict';

import API from './api';

class GasPrice {
	constructor(maxInFlight) {
		this.api = new API(`https://gasprice.poa.network`, maxInFlight);
	}

	get(cb) {
		this.api.get('', {}, (body, error) => {
			cb.call(this.api, body, error);
		});
	}
}

export default GasPrice;