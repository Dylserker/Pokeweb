import { Link } from 'react-router';
import './Header.css';
import logo from '../../assets/logo.png';
import { useTheme } from '../../hooks/useTheme';
import { BsSun, BsMoon } from 'react-icons/bs';

function Header() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <header className="header">
            <nav className="nav">
                <Link to="/" className="brand-link" aria-label="Retour à l'accueil">
                    <img src={logo} alt="PokéWeb" />
                </Link>
                <div className="links">
                    <Link to="/">Accueil</Link>
                    <Link to="/trainer">Dresseurs</Link>
                    <Link to="/one-day-one-pokemon">1 Pokémon / jour</Link>
                    <Link to="/soundtrack">Soundtrack</Link>
                    <Link to="/contact">Contact</Link>
                    <button 
                        className="theme-toggle" 
                        onClick={toggleTheme}
                        aria-label={isDark ? "Passer au thème clair" : "Passer au thème sombre"}
                        title={isDark ? "Thème sombre" : "Thème clair"}
                    >
                        {isDark ? <BsMoon /> : <BsSun />}
                    </button>
                </div>
            </nav>
        </header>
    )
}

export default Header;