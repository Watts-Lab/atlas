import React, { useState } from 'react'

const PaperInputDescription: React.FC = () => {
  // Using an array to track multiple selected papers
  const [selectedPapers, setSelectedPapers] = useState<string[]>([])

  const paperList = ['Paper 1', 'Paper 2', 'Paper 3', 'Paper 4']

  const handlePaperChange = (paper: string) => {
    // Checking if the paper is already selected
    const isAlreadySelected = selectedPapers.includes(paper)
    if (isAlreadySelected) {
      setSelectedPapers(selectedPapers.filter((selectedPaper) => selectedPaper !== paper))
    } else {
      setSelectedPapers([...selectedPapers, paper])
    }
  }

  return (
    <div className='form-control w-full max-w-xs'>
      <label className='label'>
        <span className='label-text'>Select papers:</span>
      </label>

      <div className='space-y-2'>
        {paperList.map((paperName, index) => (
          <label key={index} className='cursor-pointer flex items-center space-x-2'>
            <input
              type='checkbox'
              className='checkbox checkbox-xs'
              checked={selectedPapers.includes(paperName)}
              onChange={() => handlePaperChange(paperName)}
            />
            <span>{paperName}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default PaperInputDescription
