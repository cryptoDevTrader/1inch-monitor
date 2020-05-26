'use strict';

import log from './modules/logger';
import requireEnvs from './modules/require-envs';
import Telegram from './modules/telegram';
import OneInch from './modules/1inch';
import RulesParser from './modules/rules-parser';
import App from './modules/app';
import GasPrice from './modules/gasprice.mjs';

requireEnvs('TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RULES');

const interval = (parseInt(process.env.INTERVAL_SECONDS) || 10) * 1000,
	  maxInFlight = parseInt(process.env.MAX_INFLIGHT) || 3,
	  oneInch = new OneInch(process.env.API_VERSION || 'v1.1', maxInFlight, true),
	  gasPrice = new GasPrice(maxInFlight),
	  telegram = new Telegram(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID),
	  rules = new RulesParser().parse(process.env.RULES),
	  app = new App(oneInch, gasPrice, telegram);

app.monitor(rules, interval);