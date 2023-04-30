import Currency from "../models/currency";
import {Repository} from "sequelize-typescript";

export class CurrencyService {
    private readonly currencyRepository: Repository<Currency>

    constructor(currencyRepository: Repository<Currency>) {
        this.currencyRepository = currencyRepository;
    }

    async getCurrencies(): Promise<Currency[]> {
        return await this.currencyRepository.findAll();
    }

    async getCurrencyById(id: number): Promise<Currency | null> {
        return await this.currencyRepository.findByPk(id);
    }

    async addCurrency(name: string): Promise<Currency> {
        if (!name) {
            throw new Error("Cannot add currency with empty name");
        }

        let currency = this.currencyRepository.build({name: name});
        await currency.save();

        return currency;
    }

    async updateCurrency(currencyId: number, name: string) {
        if (!name) {
            throw new Error("Cannot set empty currency name.");
        }

        await this.currencyRepository.update(
            {
                name: name
            },
            {
                where: {id: currencyId}
            });
    }

    async deleteCurrencyById(id: number) {
        await this.currencyRepository.destroy({where: {id: id}});
    }
}
