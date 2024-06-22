import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter as Router } from 'react-router-dom'
import Home from './Home'

describe('Home', () => {
  it('should render Home component', () => {
    const { getByTestId } = render(
      <Router>
        <Home />
      </Router>,
    )
    const home = getByTestId('home-h1')
    expect(home).toBeTruthy()
  })
})
