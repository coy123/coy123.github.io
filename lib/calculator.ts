export enum TimeOfDay {
    DAY,
    NIGHT,
    DAY_AND_NIGHT
}

export enum CityType {
    BUSINESS,
    TOURIST,
    SMALL
}

export enum Fuel{
    PETROL,
    ELECTRIC
}

const cityToOccupancy = new Map([[CityType.BUSINESS, 0.7], [CityType.TOURIST, 0.6], [CityType.SMALL, 0.4]]);
const cityToHourlyRate = new Map([[CityType.BUSINESS, 45], [CityType.TOURIST, 50], [CityType.SMALL, 38]]);
const cityToDistance = new Map([[CityType.BUSINESS, 18], [CityType.TOURIST, 22], [CityType.SMALL, 15]]); //distance per hour in each city
const timeOfDayMultiplier = new Map([[TimeOfDay.DAY, 1], [TimeOfDay.NIGHT, 1.2], [TimeOfDay.DAY_AND_NIGHT, 1.1]]);
const fuelCost = new Map([[Fuel.PETROL, 0.1], [Fuel.ELECTRIC, 0.06]]);
const fixedCost = 1000 //per month, leasing of the car etc.


export interface CalculatorInputs {
    hoursPerDay: number,
    daysPerMonth: number,
    timeOfDay: TimeOfDay,
    cityType: CityType,
    fuel: Fuel,
}

export function calculateIncome(inputs: CalculatorInputs): number {
    const totalHours = inputs.hoursPerDay * inputs.daysPerMonth
    const billableHours = totalHours * cityToOccupancy.get(inputs.cityType)!!
    const hourlyRate = cityToHourlyRate.get(inputs.cityType)!! * timeOfDayMultiplier.get(inputs.timeOfDay)!!
    const monthlyRevenue = billableHours * hourlyRate
    const totalKm = totalHours * cityToDistance.get(inputs.cityType)!!
    const variableCosts = totalKm * fuelCost.get(inputs.fuel)!!
    const grossProfit = monthlyRevenue - variableCosts - fixedCost
    return grossProfit
}