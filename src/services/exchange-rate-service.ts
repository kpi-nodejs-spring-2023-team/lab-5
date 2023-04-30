import ExchangeRate from "../models/exchange-rate";
import { CurrencyService } from "./currency-service";
import { Repository } from "sequelize-typescript";
import { Op } from "sequelize";

export class ExchangeRateService {
	private currencyService: CurrencyService;
	private exchangeRateRepository: Repository<ExchangeRate>;

	constructor(exchangeRateRepository: Repository<ExchangeRate>, currencyService: CurrencyService) {
		this.currencyService = currencyService;
		this.exchangeRateRepository = exchangeRateRepository;
	}

	public async getExchangeRates() : Promise<ExchangeRate[]> {
		return await this.exchangeRateRepository.findAll();
	}

	public async getExchangeRatesOnDay(date: Date) : Promise<ExchangeRate[]> {
		return await this.exchangeRateRepository.findAll({where: { date: date }});
	}

	public async getExchangeRateById(id: number) : Promise<ExchangeRate | null> {
		return await this.exchangeRateRepository.findByPk(id);
	}

	public async getExchangeRatesForCurrencyOnDates(
		currencyId: number,
		fromDate: Date,
		toDate: Date
	) {
		return await this.exchangeRateRepository.findAll({
			where: {
				date: {[Op.gte]: fromDate, [Op.lte]: toDate},
				fromCurrencyId: currencyId
			}
		})
	}

	public async addExchangeRate(
		date: Date,
		fromCurrencyId: number,
		toCurrencyId: number,
		rate: number
	) {
		if (fromCurrencyId === toCurrencyId) {
			throw new Error("Cannot set rate to same currency!");
		}

		let existingRates = await this.exchangeRateRepository.findAll(
			{
				where:{
					date: date,
					fromCurrencyId: fromCurrencyId,
					toCurrencyId: toCurrencyId
				}
			}
		);

		if (existingRates.length !== 0) {
			throw new Error(
				"There is already the rate for these currencies on this date!"
			);
		}

		let fromCurrency = await this.currencyService.getCurrencyById(fromCurrencyId);
		if (!fromCurrency) {
			throw new Error("FromCurrency is missing");
		}

		let toCurrency = await this.currencyService.getCurrencyById(toCurrencyId);
		if (!toCurrency) {
			throw new Error("ToCurrency is missing");
		}

		let straightExchangeRate = new ExchangeRate({
			fromCurrency: fromCurrency,
			toCurrency: toCurrency,
			date: date,
			rate: rate
		});
		let reversedExchangeRate = new ExchangeRate({
				fromCurrency: toCurrency,
				toCurrency: fromCurrency,
				date: date,
				rate: 1 / rate
			}
		);

		straightExchangeRate.reversedRateId = reversedExchangeRate.id;
		reversedExchangeRate.reversedRateId = straightExchangeRate.id;

		await straightExchangeRate.save();
		await reversedExchangeRate.save();
	}

	public async updateExchangeRate(exchangeRateId: number, rate: number) {
		let exchangeRate = await this.exchangeRateRepository.findByPk(exchangeRateId);

		if (!exchangeRate) {
			throw new Error("Cannot find exchangeRate.");
		}

		await this.exchangeRateRepository.update({ rate: rate }, { where: { id: exchangeRate.id }});

		let reversedExchangeRate = await this.exchangeRateRepository.findByPk(exchangeRate.reversedRateId);

		if (reversedExchangeRate) {
			await this.exchangeRateRepository.update({ rate: 1 / rate }, { where: { id: reversedExchangeRate.id }});
		}
	}

	public async deleteExchangeRateById(id: number) {
		let exchangeRate = await this.exchangeRateRepository.findByPk(id);

		if (!exchangeRate) {
			throw new Error("Cannot find exchangeRate.");
		}

		await this.exchangeRateRepository.destroy({ where: { id: { [Op.or]: [exchangeRate.id, exchangeRate.reversedRateId]} }});
	}
}
