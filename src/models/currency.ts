import {Column, DataType, HasMany, Max, Model, PrimaryKey, Table} from "sequelize-typescript";
import ExchangeRate from "./exchange-rate";

@Table
export default class Currency extends Model {
  @Column({ primaryKey: true, type: DataType.INTEGER, autoIncrement: true })
  id!: number;

  @Max(200)
  @Column({ type: DataType.TEXT })
  name!: string;

  @HasMany(() => ExchangeRate)
  exchangeRates!: ExchangeRate[]
}
