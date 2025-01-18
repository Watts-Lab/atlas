import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter as Router } from 'react-router-dom'
import Home from './Home'

describe('Galaxy', () => {
  it('should render Login component', () => {
    const { getByTestId } = render(
      <Router>
        <Home />
      </Router>,
    )
    const input = getByTestId('email-input')
    expect(input).toBeTruthy()
  })
})
