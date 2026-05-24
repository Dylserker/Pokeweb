import { useEffect, useMemo, useState, type FormEvent } from 'react'
import Header from '../../components/Header/Header'
import Footer from '../../components/Footer/Footer'
import Searchbar from '../../components/Searchbar/Searchbar'
import PokemonCard from '../../components/Card/PokemonCard/PokemonCard'
import {
	COLOR_LABELS,
	GENERATION_LABELS,
	HABITAT_LABELS,
	MAX_ATTEMPTS
} from '../../constants/oneDayOnePokemon'
import {
	getLocalizedTypes,
	mapPokemonToCard,
	resolvePokemonIdentifier
} from '../../functions/pokemon'
import type { PokemonApiResponse, PokemonCardData, PokemonSpeciesApiResponse } from '../../types/pokemon'
import type {
	DailyPokemonSpeciesResponse,
	GuessEntry,
	SpeciesCountResponse,
	SpeciesDetails
} from '../../types/oneDayOnePokemon'
import './OneDayOnePokemon.css'

function hashString(value: string): number {
	let hash = 2166136261

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index)
		hash = Math.imul(hash, 16777619)
	}

	return hash >>> 0
}

function formatNumber(value: number): string {
	return String(value).padStart(3, '0')
}

function formatGeneration(value: string): string {
	return GENERATION_LABELS[value] ?? value.replace('generation-', 'Génération ')
}

function formatColor(value: string): string {
	return COLOR_LABELS[value] ?? value
}

function formatHabitat(value: string): string {
	return HABITAT_LABELS[value] ?? value.replace(/-/g, ' ')
}

function formatCaptureRate(value: number): string {
	return `${value} / 255`
}

function getFrenchSpeciesName(speciesData: PokemonSpeciesApiResponse, fallback: string): string {
	const frenchEntry = speciesData.names.find((entry) => entry.language.name === 'fr')
	return frenchEntry?.name ?? fallback
}

function OneDayOnePokemon() {
	const [dailySeed] = useState(() => new Date().toISOString().slice(0, 10))
	const [reloadToken, setReloadToken] = useState(0)
	const [isLoading, setIsLoading] = useState(true)
	const [errorMessage, setErrorMessage] = useState('')
	const [targetPokemon, setTargetPokemon] = useState<PokemonCardData | null>(null)
	const [targetSpecies, setTargetSpecies] = useState<SpeciesDetails | null>(null)
	const [guessValue, setGuessValue] = useState('')
	const [guesses, setGuesses] = useState<GuessEntry[]>([])
	const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS)
	const [statusMessage, setStatusMessage] = useState(
		'Trouve le Pokémon du jour avec le moins d’essais possible.'
	)
	const [gameState, setGameState] = useState<'loading' | 'playing' | 'won' | 'lost'>('loading')

	useEffect(() => {
		const controller = new AbortController()

		async function loadDailyPokemon() {
			setIsLoading(true)
			setErrorMessage('')
			setTargetPokemon(null)
			setTargetSpecies(null)
			setGuesses([])
			setGuessValue('')
			setAttemptsLeft(MAX_ATTEMPTS)
			setStatusMessage('Trouve le Pokémon du jour avec le moins d’essais possible.')
			setGameState('loading')

			try {
				const countResponse = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=1', {
					signal: controller.signal
				})

				if (!countResponse.ok) {
					throw new Error('species-count-unavailable')
				}

				const countData = (await countResponse.json()) as SpeciesCountResponse
				const totalSpecies = countData.count

				if (!totalSpecies) {
					throw new Error('species-count-invalid')
				}

				const targetId = (hashString(dailySeed) % totalSpecies) + 1

				const speciesResponse = await fetch(
					`https://pokeapi.co/api/v2/pokemon-species/${targetId}`,
					{ signal: controller.signal }
				)

				if (!speciesResponse.ok) {
					throw new Error('species-unavailable')
				}

				const speciesData = (await speciesResponse.json()) as DailyPokemonSpeciesResponse

				const pokemonResponse = await fetch(
					`https://pokeapi.co/api/v2/pokemon/${targetId}`,
					{ signal: controller.signal }
				)

				if (!pokemonResponse.ok) {
					throw new Error('pokemon-unavailable')
				}

				const pokemonData = (await pokemonResponse.json()) as PokemonApiResponse
				const localizedTypes = await getLocalizedTypes(pokemonData, controller.signal)
				const localizedName = getFrenchSpeciesName(speciesData, pokemonData.name)

				if (controller.signal.aborted) {
					return
				}

				setTargetSpecies({
					id: speciesData.id,
					name: speciesData.name,
					frenchName: localizedName,
					generation: speciesData.generation?.name ?? 'generation-i',
					color: speciesData.color?.name ?? 'unknown',
					habitat: speciesData.habitat?.name ?? 'inconnu',
					captureRate: speciesData.capture_rate ?? 0
				})
				setTargetPokemon(mapPokemonToCard(pokemonData, localizedName, localizedTypes))
				setGameState('playing')
			} catch (error) {
				if ((error as Error).name === 'AbortError') {
					return
				}

				setErrorMessage('Impossible de charger le défi du jour. Vérifie ta connexion à PokéAPI.')
				setGameState('loading')
			} finally {
				if (!controller.signal.aborted) {
					setIsLoading(false)
				}
			}
		}

		loadDailyPokemon()

		return () => {
			controller.abort()
		}
	}, [dailySeed, reloadToken])

	const revealedHints = useMemo(() => {
		if (!targetSpecies) {
			return []
		}

		const clues = [
			{ label: 'Génération', value: formatGeneration(targetSpecies.generation) },
			{ label: 'Couleur', value: formatColor(targetSpecies.color) },
			{ label: 'Habitat', value: formatHabitat(targetSpecies.habitat) },
			{ label: 'Taux de capture', value: formatCaptureRate(targetSpecies.captureRate) }
		]

		const revealedCount = Math.max(0, MAX_ATTEMPTS - attemptsLeft)

		return clues.slice(0, revealedCount)
	}, [attemptsLeft, targetSpecies])

	async function handleGuessSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		if (!guessValue.trim() || !targetPokemon || gameState !== 'playing') {
			return
		}

		const controller = new AbortController()

		try {
			const resolvedIdentifier = await resolvePokemonIdentifier(guessValue.trim(), controller.signal)
			const pokemonResponse = await fetch(
				`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(resolvedIdentifier)}`,
				{ signal: controller.signal }
			)

			if (!pokemonResponse.ok) {
				throw new Error('pokemon-not-found')
			}

			const pokemonData = (await pokemonResponse.json()) as PokemonApiResponse

			if (guesses.some((guess) => guess.id === pokemonData.id)) {
				setStatusMessage('Ce Pokémon a déjà été proposé.')
				return
			}

			const speciesResponse = await fetch(
				`https://pokeapi.co/api/v2/pokemon-species/${pokemonData.id}`,
				{ signal: controller.signal }
			)

			if (!speciesResponse.ok) {
				throw new Error('species-not-found')
			}

			const speciesData = (await speciesResponse.json()) as PokemonSpeciesApiResponse
			const localizedName = getFrenchSpeciesName(speciesData, pokemonData.name)
			const localizedTypes = await getLocalizedTypes(pokemonData, controller.signal)
			const guessCard = mapPokemonToCard(pokemonData, localizedName, localizedTypes)
			const isCorrect = guessCard.number === targetPokemon.number
			const sharedTypes = guessCard.types.filter((type) => targetPokemon.types.includes(type))

			setGuesses((current) => [
				...current,
				{
					id: guessCard.number,
					name: guessCard.name,
					types: guessCard.types,
					verdict: isCorrect
						? 'C’est le bon Pokémon.'
						: guessCard.number < targetPokemon.number
							? 'Le Pokémon du jour a un numéro plus élevé.'
							: 'Le Pokémon du jour a un numéro plus faible.',
					sharedTypes
				}
			])

			setGuessValue('')

			if (isCorrect) {
				setGameState('won')
				setStatusMessage(`Bravo ! Le Pokémon du jour était bien ${targetPokemon.name}.`)
				return
			}

			setAttemptsLeft((currentAttempts) => {
				const nextAttempts = currentAttempts - 1

				if (nextAttempts <= 0) {
					setGameState('lost')
					setStatusMessage(`Partie terminée. Le Pokémon du jour était ${targetPokemon.name}.`)
				} else {
					setStatusMessage(`Raté. Il te reste ${nextAttempts} essai${nextAttempts > 1 ? 's' : ''}.`)
				}

				return nextAttempts
			})
		} catch (error) {
			if ((error as Error).name === 'AbortError') {
				return
			}

			setStatusMessage('Pokémon introuvable. Essaie un nom français, un nom anglais ou un numéro.')
		}
	}

	return (
		<div className="page-shell one-day-page">
			<Header />
			<main className="one-day-main">
				<section className="one-day-hero" aria-labelledby="one-day-title">
					<p className="one-day-kicker">Jeu du jour</p>
					<h1 id="one-day-title">One Day One Pokémon</h1>
					<p className="one-day-subtitle">
						Un Pokémon est choisi automatiquement chaque jour depuis PokéAPI.
						À toi de le trouver en français avec 5 essais maximum.
					</p>

					<div className="one-day-meta" aria-label="Informations du défi">
						<article>
							<span>Essais restants</span>
							<strong>{attemptsLeft}</strong>
						</article>
						<article>
							<span>État</span>
							<strong>
								{gameState === 'won'
									? 'Gagné'
									: gameState === 'lost'
										? 'Perdu'
										: isLoading
											? 'Chargement'
											: 'En cours'}
							</strong>
						</article>
						<article>
							<span>Défi du jour</span>
							<strong>{dailySeed}</strong>
						</article>
					</div>
				</section>

				<section className="one-day-layout">
					<div className="one-day-playground">
						<form className="one-day-form" onSubmit={handleGuessSubmit}>
							<Searchbar
								placeholder="Nom français, nom anglais ou numéro du Pokédex..."
								className="one-day-input"
								containerClassName="one-day-searchbar"
								aria-label="Proposer un Pokémon"
								value={guessValue}
								onValueChange={setGuessValue}
								disabled={gameState !== 'playing'}
							/>

							<button
								type="submit"
								className="one-day-submit"
								disabled={gameState !== 'playing' || guessValue.trim().length === 0}
							>
								Valider
							</button>
						</form>

						<p className="one-day-status" aria-live="polite">
							{isLoading ? 'Chargement du Pokémon du jour...' : errorMessage || statusMessage}
						</p>

						<div className="one-day-hints">
							{revealedHints.length > 0 ? (
								revealedHints.map((hint) => (
									<article key={hint.label} className="one-day-hint-card">
										<span>{hint.label}</span>
										<strong>{hint.value}</strong>
									</article>
								))
							) : (
								<article className="one-day-hint-card one-day-hint-card--empty">
									<span>Indices</span>
									<strong>Commence à proposer des Pokémon pour débloquer des indices.</strong>
								</article>
							)}
						</div>

						<section className="one-day-history" aria-labelledby="history-title">
							<div className="one-day-section-header">
								<h2 id="history-title">Historique des essais</h2>
								<span>{guesses.length} proposition{guesses.length > 1 ? 's' : ''}</span>
							</div>

							{guesses.length > 0 ? (
								<ul className="one-day-guess-list">
									{guesses.map((guess) => (
										<li key={guess.id} className="one-day-guess-item">
											<div className="one-day-guess-top">
												<strong>{guess.name}</strong>
												<span>#{formatNumber(guess.id)}</span>
											</div>
											<p>{guess.verdict}</p>
											<div className="one-day-type-list" aria-label="Types trouvés">
												{guess.types.map((type) => (
													<span key={type} className="one-day-type-chip">
														{type}
													</span>
												))}
											</div>
											{guess.sharedTypes.length > 0 ? (
												<p className="one-day-match-note">
													Types en commun : {guess.sharedTypes.join(', ')}
												</p>
											) : null}
										</li>
									))}
								</ul>
							) : (
								<p className="one-day-empty-state">Aucun essai pour le moment.</p>
							)}
						</section>
					</div>

					<aside className="one-day-reveal" aria-label="Révélation du Pokémon du jour">
						{targetPokemon && targetSpecies && (gameState === 'won' || gameState === 'lost') ? (
							<>
								<p className="one-day-reveal-kicker">Réponse du jour</p>
								<PokemonCard {...targetPokemon} />
								<div className="one-day-reveal-note">
									<p>
										{gameState === 'won'
											? 'Tu as trouvé le bon Pokémon.'
											: 'Le Pokémon du jour était caché derrière ces indices.'}
									</p>
									<ul>
										<li>Génération: {formatGeneration(targetSpecies.generation)}</li>
										<li>Couleur: {formatColor(targetSpecies.color)}</li>
										<li>Habitat: {formatHabitat(targetSpecies.habitat)}</li>
										<li>Taux de capture: {formatCaptureRate(targetSpecies.captureRate)}</li>
									</ul>
								</div>
							</>
						) : (
							<div className="one-day-mystery-panel">
								<span className="one-day-mystery-badge">PokéAPI</span>
								<h2>Le Pokémon du jour est caché</h2>
								<p>
									Les indices se débloquent au fil de tes essais.
								</p>
								<div className="one-day-mystery-orb" aria-hidden="true">
									?
								</div>
							</div>
						)}

						{errorMessage ? (
							<button
								type="button"
								className="one-day-retry"
								onClick={() => setReloadToken((current) => current + 1)}
							>
								Recharger le défi
							</button>
						) : null}
					</aside>
				</section>
			</main>
			<Footer />
		</div>
	)
}

export default OneDayOnePokemon
