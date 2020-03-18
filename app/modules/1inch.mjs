'use strict';

import API from './api';
import log from './logger';

class OneInch {
	constructor(apiVersion, maxInFlight, convertTokenAmounts) {
		this.tokens = null;
		this.convertTokenAmounts = convertTokenAmounts == null ? false : convertTokenAmounts;
		this.api = new API(`https://api.1inch.exchange/${apiVersion}`, maxInFlight);
	}

	getTokens(cb) {
		const _self = this;

		this.api.get('tokens', null, (body, error) => {
			if (body && body.message) {
				cb.call(this.api, body, `${body.message}`);
				return;
			}

			_self.tokens = body;
			cb.call(this.api, body, error);
		});
	}

	getQuote(params, cb) {
		this.get('quote', params, cb);
	}

	getSwap(params, cb) {
		this.get('swap', params, cb);
	}

	getSwapQuote(params, cb) {
		this.get('swapQuote', params, cb);
	}

	get(type, params, cb) {
		const _self = this;

		if (this.tokens == null) {
			this.getTokens((tokens, error) => {
				if (error) {
					return;
				}

				_self.get(type, params, cb);
			});

			return;
		}

		[params.fromTokenSymbol, params.toTokenSymbol].forEach(symbol => {
			if (!_self.tokens.hasOwnProperty(symbol)) {
				log.error(`Unknown token: ${symbol}`);
				return;
			}
		});

		if (this.convertTokenAmounts && params.amount) {
			params.amount = (params.amount * parseFloat(`${10}e${this.tokens[params.fromTokenSymbol].decimals}`)).toLocaleString('fullwide', {useGrouping: false});
		}

		this.api.get(type, params, (body, error) => {
			if (body && body.message) {
				cb.call(this.api, body, `${body.message}`);
				return;
			}

			if (error) {
				cb.call(this.api, body, error);
				return;
			}

			if (_self.convertTokenAmounts && body && body.toTokenAmount && body.toToken.decimals) {
				body.toTokenAmount = body.toTokenAmount / parseFloat(`${10}e${body.toToken.decimals}`);
			}

			cb.call(this.api, body, error);
		});
	}
}

export default OneInch;