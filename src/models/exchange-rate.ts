import Currency from "./currency";
import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from "sequelize-typescript";

@Table
export default class ExchangeRate extends Model {
  @Column({ primaryKey: true, type: DataType.INTEGER, autoIncrement: true })
  id!: number;

  @Column({ type: DataType.INTEGER })
  @ForeignKey(() => Currency)
  fromCurrencyId!: number;

  @BelongsTo(() => Currency)
  fromCurrency!: Currency;

  @Column({ type: DataType.INTEGER })
  @ForeignKey(() => Currency)
  toCurrencyId!: number;

  @BelongsTo(() => Currency)
  toCurrency!: Currency;

  @Column({ type: DataType.DATEONLY })
  date!: Date;

  @Column({ type: DataType.DECIMAL })
  rate!: number;

  @Column({ type: DataType.INTEGER })
  @ForeignKey(() => ExchangeRate)
  reversedRateId!: number;

  @BelongsTo(() => ExchangeRate)
  reversedRate!: ExchangeRate;
}
