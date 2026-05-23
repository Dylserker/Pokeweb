import type { PokemonSpeciesApiResponse } from './pokemon'

export type SpeciesDetails = {
	id: number
	name: string
	frenchName: string
	generation: string
	color: string
	habitat: string
	captureRate: number
}

export type GuessEntry = {
	id: number
	name: string
	types: string[]
	verdict: string
	sharedTypes: string[]
}

export type SpeciesCountResponse = {
	count: number
}

export type DailyPokemonSpeciesResponse = PokemonSpeciesApiResponse & {
	id: number
	name: string
	color?: {
		name: string
	}
	habitat?: {
		name: string
	} | null
	generation?: {
		name: string
	}
	capture_rate?: number
}