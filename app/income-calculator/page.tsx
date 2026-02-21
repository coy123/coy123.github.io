'use client'

import { useState } from 'react'
import { getTranslations } from '@/lib/translations'
import { calculateIncome, CalculatorInputs, TimeOfDay, CityType, Fuel } from '@/lib/calculator'

export default function IncomeCalculatorPage() {
  const t = getTranslations()
  const [inputs, setInputs] = useState<CalculatorInputs>({
    hoursPerDay: 8,
    daysPerMonth: 20,
    timeOfDay: TimeOfDay.DAY,
    cityType: CityType.BUSINESS,
    fuel: Fuel.PETROL,
  })
  const [result, setResult] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const income = calculateIncome(inputs)
    setResult(income)
    setIsModalOpen(true)
  }

  const handleInputChange = (field: keyof CalculatorInputs, value: any) => {
    setInputs(prev => ({ ...prev, [field]: value }))
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  return (
    <div className="w-full max-w-4xl mx-auto lg:w-4/5 xl:w-3/4">
      <div
        className="mb-3 relative rounded-lg overflow-hidden p-4 sm:p-6"
        style={{
          backgroundImage: 'url(/images/driver.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.incomeCalculator.title}
        </h1>
        <br/>
        <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
          {t.pages.incomeCalculator.subtitle}
        </h2>
      </div>

      <div className="mb-6 sm:mb-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hours per day */}
            <div>
              <label htmlFor="hoursPerDay" className="block text-sm font-medium text-gray-300 mb-2">
                Ore al giorno
              </label>
              <input
                type="number"
                id="hoursPerDay"
                min="1"
                max="24"
                value={inputs.hoursPerDay}
                onChange={(e) => handleInputChange('hoursPerDay', Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Days per month */}
            <div>
              <label htmlFor="daysPerMonth" className="block text-sm font-medium text-gray-300 mb-2">
                Giorni al mese
              </label>
              <input
                type="number"
                id="daysPerMonth"
                min="1"
                max="31"
                value={inputs.daysPerMonth}
                onChange={(e) => handleInputChange('daysPerMonth', Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Time of day */}
            <div>
              <label htmlFor="timeOfDay" className="block text-sm font-medium text-gray-300 mb-2">
                Orario di lavoro
              </label>
              <select
                id="timeOfDay"
                value={inputs.timeOfDay}
                onChange={(e) => handleInputChange('timeOfDay', Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={TimeOfDay.DAY}>Giorno</option>
                <option value={TimeOfDay.NIGHT}>Notte</option>
                <option value={TimeOfDay.DAY_AND_NIGHT}>Giorno e Notte</option>
              </select>
            </div>

            {/* City type */}
            <div>
              <label htmlFor="cityType" className="block text-sm font-medium text-gray-300 mb-2">
                Tipo di città
              </label>
              <select
                id="cityType"
                value={inputs.cityType}
                onChange={(e) => handleInputChange('cityType', Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={CityType.BUSINESS}>Business</option>
                <option value={CityType.TOURIST}>Turistica</option>
                <option value={CityType.SMALL}>Piccola</option>
              </select>
            </div>

            {/* Fuel type */}
            <div className="md:col-span-2 md:max-w-md md:mx-auto md:w-full">
              <label htmlFor="fuel" className="block text-sm font-medium text-gray-300 mb-2">
                Tipo di carburante
              </label>
              <select
                id="fuel"
                value={inputs.fuel}
                onChange={(e) => handleInputChange('fuel', Number(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={Fuel.PETROL}>Benzina</option>
                <option value={Fuel.ELECTRIC}>Elettrico</option>
              </select>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            Calcola Guadagno
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {t.pages.incomeCalculator.disclaimer}
          </p>
        </form>

        {/* Internal links */}
        <div className="mt-6 bg-gray-700 rounded-lg p-4 sm:p-6 space-y-2">
          <h3 className="text-lg font-semibold text-white mb-3">Risorse utili</h3>
          <p className="text-sm">
            <a href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
              Trova il tuo bando NCC →
            </a>
          </p>
          <p className="text-sm">
            <a href="/how-to-become-driver" className="text-blue-400 hover:text-blue-300 transition-colors">
              Come diventare autista NCC →
            </a>
          </p>
          <p className="text-sm">
            <a href="/faq" className="text-blue-400 hover:text-blue-300 transition-colors">
              Domande frequenti →
            </a>
          </p>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 animate-fadeIn"
            onClick={closeModal}
          />

          {/* Modal content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 border border-gray-600 animate-scaleIn">
              {/* Close button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 text-white hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Modal header */}
              <h3 className="text-2xl font-bold text-gray-300 mb-4">Risultato</h3>

              {/* Result */}
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-green-400">
                  {result?.toFixed(2)} € al mese
                </p>
              </div>

              {/* Close button at bottom */}
              <button
                onClick={closeModal}
                className="w-full mt-4 px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
