import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Home from './Home'

describe('Home', () => {
  it('should render', () => {
    const { getByTestId } = render(<Home />)
    const home = getByTestId('home-h1')
    expect(home).toBeTruthy()
  })
})
