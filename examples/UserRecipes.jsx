import React from 'react'
import { fetchUserRecipes, patchToggleFavorite, fetchSortedRecipes } from '../api/api'
import Button from '../components/Button/Button'
import MiniRecipeCard from '../components/RecipeCards/MiniRecipeCard'
import { useAuth } from '@clerk/clerk-react'

export default function UserRecipes() {
    const [ recipes, setRecipes ] = React.useState([])
    const [ searchTerm, setSearchTerm ] = React.useState('')
    const [ isActive, setIsActive ] = React.useState(false)
    const [ unfilter, setUnfilter ] = React.useState(false)
    const [ currentSort, setCurrentSort ] = React.useState(null)
    const [ loading, setLoading ] = React.useState(true)

    const { getToken } = useAuth()

    const [token, setToken] = React.useState(null)


    function toggleButton() {
        const newIsActive = !isActive
        setIsActive(newIsActive)

        if (!newIsActive) {
            setUnfilter(prev => !prev)
        }
    }

    React.useEffect(() => {
        const init = async () => {
          try {
            const t = await getToken()
            if (!t) return
            setToken(t)
      
            setLoading(true)
            const data = await fetchUserRecipes(t)
            if (!Array.isArray(data)) {
              console.error('Expected array, got:', data)
              setRecipes([])
            } else {
              setRecipes(data)
            }
          } catch (err) {
            console.error('Error fetching token or recipes:', err)
          } finally {
            setLoading(false)
          }
        };
      
        init()
      }, [getToken, unfilter])
      


    async function toggleFavorite(id) {
        const r = recipes.find(recipe => recipe.id === id)
        const currentFavoriteValue = r.favorite
        setRecipes(prev =>
            prev.map(recipe => recipe.id === id ? { ...recipe, favorite: !recipe.favorite } : recipe)
        )

        try {
            await patchToggleFavorite(id, token)
        } catch (error) {
            setRecipes(prev =>
            prev.map(recipe => recipe.id === id ? { ...recipe, favorite: currentFavoriteValue } : recipe)
            )
        }
        }


    const filteredRecipes = recipes
        .filter(recipe => {
            if (isActive && !recipe.favorite) return false
            return true
        })
        .filter(recipe =>
            recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
        )

    const userRecipes = filteredRecipes.map(recipe => <MiniRecipeCard 
                                                        key={recipe.id} 
                                                        recipe={recipe} 
                                                        toggleFavorite={toggleFavorite}/>)

    function handleChange(event) {
        event.preventDefault()
        const { value } = event.target
        setSearchTerm(value)
    }

    function sortRecipes(event) {
        event.preventDefault()
        const { value } = event.target

        if (value === 'starred') {
            toggleButton()
            setCurrentSort(value)
            return
        }

        if (currentSort === value) {
            setCurrentSort(null)
            setUnfilter(prev => !prev)
            return
        }

        setCurrentSort(value)

        fetchSortedRecipes(value, token)
            .then(sortedRecipes => {
            setRecipes(sortedRecipes)
            })
            .catch(err => {
            alert(err.message)
            console.error('Error when sorting recipes:', err)
            })

    }

    return (
        <>
            <div className="recipes-header">
                <h1>your recipes</h1>
                <form className="search-bar">
                    <input 
                    type="search" 
                    placeholder="tomato sauce..." 
                    onChange={handleChange} 
                    value={searchTerm} 
                    />
                </form>
                <div className="filters">
                    <Button
                        variant='secondary'
                        style={{width:'30px', height:'30px'}} 
                        isActive={isActive}
                        onClick={sortRecipes}
                        value="starred"
                    >
                        ✩
                    </Button>
                    <Button 
                        variant='secondary'
                        style={{height:'30px'}} 
                        isActive={currentSort === 'newest'}
                        onClick={sortRecipes} 
                        value="newest"
                    >
                        newest
                    </Button>
                    <Button 
                        variant='secondary'
                        style={{height:'30px'}}  
                        isActive={currentSort === 'oldest'}
                        onClick={sortRecipes} 
                        value="oldest"
                    >
                        oldest
                    </Button>
                </div>
            </div>
            
            { loading ? (
            <div className='recipe-grid'>
                {[...Array(6)].map((_, i) => (
                <div key={i} className='skeleton'/>
                ))}
            </div>
            )
            :searchTerm ? 
            (userRecipes && userRecipes.length > 0 ? 
            <div className='recipe-grid'>
              {userRecipes}
            </div> : <p>no matching recipes found</p>) 
            : 
            (userRecipes && userRecipes.length > 0 ? 
            <div className='recipe-grid'>
              {userRecipes}
            </div> : <p>no recipes found</p>)
            }
        </>
    )
}
