import { useEffect, useMemo, useState } from 'react'
import { getPokemonAbilities, getPokemonItems, getPokemonMoves } from '../../../functions/pokemon'
import type { AbilityOption, ItemOption, MoveOption } from '../../../functions/pokemon'
import type { PokemonApiResponse } from '../../../types/pokemon'
import './StrategicCard.css'

type MoveSlot = {
  move: string
  level: number
}

type StrategicBuild = {
  item: string
  ability: string
  level: number
  moves: MoveSlot[]
}

type StrategicCardProps = {
  pokemonId?: number
  title?: string
  initialLevel?: number
  onBuildChange?: (build: StrategicBuild) => void
}

type StatData = {
  label: string
  value: number
}

const STAT_LABELS: Record<string, string> = {
  hp: 'PV',
  attack: 'Attaque',
  defense: 'Défense',
  'special-attack': 'Att. spé',
  'special-defense': 'Déf. spé',
  speed: 'Vitesse'
}

function calculateStats(baseStats: StatData[], level: number): StatData[] {
  return baseStats.map((stat) => {
    if (stat.label === 'PV') {
      return {
        ...stat,
        value: Math.floor((2 * stat.value * level) / 100) + level + 5
      }
    }
    return {
      ...stat,
      value: Math.floor((2 * stat.value * level) / 100) + 5
    }
  })
}

function StrategicCard({
  pokemonId = 25,
  title = 'Strategic Build',
  initialLevel = 50,
  onBuildChange
}: StrategicCardProps) {
  const [items, setItems] = useState<ItemOption[]>([])
  const [abilities, setAbilities] = useState<AbilityOption[]>([])
  const [moves, setMoves] = useState<MoveOption[]>([])
  const [baseStats, setBaseStats] = useState<StatData[]>([])
  const [calculatedStats, setCalculatedStats] = useState<StatData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [item, setItem] = useState('')
  const [ability, setAbility] = useState('')
  const [level, setLevel] = useState(Math.min(100, Math.max(1, initialLevel)))
  const [moveSlots, setMoveSlots] = useState<MoveSlot[]>([
    { move: '', level: level },
    { move: '', level: level },
    { move: '', level: level },
    { move: '', level: level }
  ])

  useEffect(() => {
    const controller = new AbortController()

    const loadData = async () => {
      try {
        setIsLoading(true)
        
        // Fetch Pokémon data for base stats
        const pokemonResponse = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${pokemonId}`,
          { signal: controller.signal }
        )
        
        if (!pokemonResponse.ok) {
          throw new Error('Failed to fetch Pokémon data')
        }
        
        const pokemonData = (await pokemonResponse.json()) as PokemonApiResponse
        const stats = pokemonData.stats.map((item) => ({
          label: STAT_LABELS[item.stat.name] ?? item.stat.name,
          value: item.base_stat
        }))
        
        setBaseStats(stats)
        setCalculatedStats(calculateStats(stats, level))
        
        const [itemsData, abilitiesData, movesData] = await Promise.all([
          getPokemonItems(controller.signal),
          getPokemonAbilities(pokemonId, controller.signal),
          getPokemonMoves(pokemonId, controller.signal)
        ])

        setItems(itemsData)
        setAbilities(abilitiesData)
        setMoves(movesData)

        setItem(itemsData[0]?.value ?? '')
        setAbility(abilitiesData[0]?.value ?? '')
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Erreur lors du chargement des données:', error)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    return () => controller.abort()
  }, [pokemonId])

  useEffect(() => {
    if (baseStats.length > 0) {
      setCalculatedStats(calculateStats(baseStats, level))
    }
  }, [level, baseStats])

  const moveMap = useMemo(() => {
    return new Map(moves.map((moveOption) => [moveOption.value, moveOption]))
  }, [moves])

  const updateBuild = (nextBuild: StrategicBuild) => {
    onBuildChange?.(nextBuild)
  }

  const handleLevelChange = (nextLevelRaw: string) => {
    const parsedLevel = Number.parseInt(nextLevelRaw, 10)
    const nextLevel = Number.isNaN(parsedLevel) ? 1 : Math.min(100, Math.max(1, parsedLevel))

    setLevel(nextLevel)

    const nextMoveSlots = moveSlots.map((moveSlot) => {
      if (!moveSlot.move) {
        return { ...moveSlot, level: nextLevel }
      }

      const currentMove = moveMap.get(moveSlot.move)
      const minimumMoveLevel = currentMove?.learnAt ?? 1

      return {
        ...moveSlot,
        level: Math.max(moveSlot.level, minimumMoveLevel)
      }
    })

    setMoveSlots(nextMoveSlots)
    updateBuild({ item, ability, level: nextLevel, moves: nextMoveSlots })
  }

  const handleItemChange = (nextItem: string) => {
    setItem(nextItem)
    updateBuild({ item: nextItem, ability, level, moves: moveSlots })
  }

  const handleAbilityChange = (nextAbility: string) => {
    setAbility(nextAbility)
    updateBuild({ item, ability: nextAbility, level, moves: moveSlots })
  }

  const handleMoveChange = (index: number, moveValue: string) => {
    const selectedMove = moveMap.get(moveValue)
    const nextMoveSlots = [...moveSlots]

    nextMoveSlots[index] = {
      move: moveValue,
      level: selectedMove ? Math.max(selectedMove.learnAt, level) : level
    }

    setMoveSlots(nextMoveSlots)
    updateBuild({ item, ability, level, moves: nextMoveSlots })
  }

  const handleMoveLevelChange = (index: number, rawLevel: string) => {
    const parsedLevel = Number.parseInt(rawLevel, 10)
    const normalizedLevel = Number.isNaN(parsedLevel) ? 1 : Math.min(100, Math.max(1, parsedLevel))
    const selectedMove = moveMap.get(moveSlots[index].move)
    const minimumLevel = selectedMove ? selectedMove.learnAt : 1

    const nextMoveSlots = [...moveSlots]
    nextMoveSlots[index] = {
      ...nextMoveSlots[index],
      level: Math.max(normalizedLevel, minimumLevel)
    }

    setMoveSlots(nextMoveSlots)
    updateBuild({ item, ability, level, moves: nextMoveSlots })
  }

  if (isLoading) {
    return (
      <section className="strategic-card" aria-label="Configuration strategique">
        <p style={{ textAlign: 'center', color: 'var(--text)' }}>Chargement des données...</p>
      </section>
    )
  }

  return (
    <section className="strategic-card" aria-label="Configuration strategique">
      <header className="strategic-card__header">
        <h2>{title}</h2>
        <p>Choisis objet, talent, niveau et movepool apprenable.</p>
      </header>

      <div className="strategic-card__fields">
        <label className="strategic-card__field">
          <span>Objet</span>
          <select value={item} onChange={(event) => handleItemChange(event.target.value)}>
            {items.map((itemOption) => (
              <option key={itemOption.value} value={itemOption.value}>
                {itemOption.label}
              </option>
            ))}
          </select>
        </label>

        <label className="strategic-card__field">
          <span>Talent</span>
          <select value={ability} onChange={(event) => handleAbilityChange(event.target.value)}>
            {abilities.map((abilityOption) => (
              <option key={abilityOption.value} value={abilityOption.value}>
                {abilityOption.label}
              </option>
            ))}
          </select>
        </label>

        <label className="strategic-card__field">
          <span>Niveau</span>
          <input
            type="number"
            min={1}
            max={100}
            value={level}
            onChange={(event) => handleLevelChange(event.target.value)}
          />
        </label>
      </div>

      <div className="strategic-card__stats">
        <h3>Statistiques au niveau {level}</h3>
        <ul className="strategic-card__stats-list">
          {calculatedStats.map((stat) => (
            <li key={stat.label} className="strategic-card__stat-item">
              <span className="strategic-card__stat-label">{stat.label}</span>
              <span className="strategic-card__stat-value">{stat.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="strategic-card__movepool">
        <h3>Ensemble de mouvements</h3>
        <div className="strategic-card__moves">
          {moveSlots.map((moveSlot, index) => (
            <div key={`slot-${index}`} className="strategic-card__move-row">
              <label className="strategic-card__field strategic-card__field--grow">
                <span>Attaque {index + 1}</span>
                <select
                  value={moveSlot.move}
                  onChange={(event) => handleMoveChange(index, event.target.value)}
                >
                  <option value="">Sélectionner une attaque</option>
                  {moves.map((moveOption) => (
                    <option
                      key={moveOption.value}
                      value={moveOption.value}
                      disabled={moveOption.learnAt > level}
                    >
                      {moveOption.label} (Niv. {moveOption.learnAt})
                    </option>
                  ))}
                </select>
              </label>

              <label className="strategic-card__field strategic-card__field--small">
                <span>Niveau</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={moveSlot.level}
                  onChange={(event) => handleMoveLevelChange(index, event.target.value)}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default StrategicCard
