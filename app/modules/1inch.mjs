'use strict';

import API from './api';
import log from './logger';

class OneInch {
	constructor(apiVersion, convertTokenAmounts) {
		this.tokens = null;
		this.convertTokenAmounts = convertTokenAmounts == null ? false : convertTokenAmounts;
		this.api = new API(`https://api.1inch.exchange/${apiVersion}`);
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
		const _self = this;

		if (this.tokens == null) {
			this.getTokens((tokens, error) => {
				if (error) {
					return;
				}

				_self._getQuote(params, cb);
			});

			return;
		}

		this._getQuote(params, cb);
	}

	_getQuote(params, cb) {
		const _self = this;

		[params.fromTokenSymbol, params.toTokenSymbol].forEach(symbol => {
			if (!_self.tokens.hasOwnProperty(symbol)) {
				log.error(`Unknown token: ${symbol}`);
				return;
			}
		});

		if (this.convertTokenAmounts) {
			params.amount = (params.amount * parseFloat(`${10}e${this.tokens[params.fromTokenSymbol].decimals}`)).toLocaleString('fullwide', {useGrouping: false});
		}

		this.api.get('quote', params, (body, error) => {
			if (body && body.message) {
				cb.call(this.api, body, `${body.message}`);
				return;
			}

			if (_self.convertTokenAmounts) {
				body.toTokenAmount = body.toTokenAmount / parseFloat(`${10}e${body.toToken.decimals}`);
			}

			cb.call(this.api, body, error);
		});
	}
}

export default OneInch;