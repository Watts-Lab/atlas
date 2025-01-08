import fuzzysort from 'fuzzysort'
import { useEffect, useState } from 'react'
import { Feature } from './feature.types'

export type SelectFeaturesProps = {
  dialogRef: React.RefObject<HTMLDialogElement>
  setIsFeatureModalOpen: React.Dispatch<React.SetStateAction<boolean>>
  availableFeatures: Feature[]
  setAvailableFeatures: React.Dispatch<React.SetStateAction<Feature[]>>
  updateProjectFeatures: () => void
}

const SelectFeatures = ({
  availableFeatures,
  dialogRef,
  setIsFeatureModalOpen,
  setAvailableFeatures,
  updateProjectFeatures,
}: SelectFeaturesProps) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredFeatures, setFilteredFeatures] = useState<Feature[]>([])
  const [activeTab, setActiveTab] = useState<'select' | 'define'>('select')

  // New state for defining a feature
  const [newFeatureType, setNewFeatureType] = useState('')
  const [newFeatureParent, setNewFeatureParent] = useState('')
  const [newFeatureName, setNewFeatureName] = useState('')
  const [newFeatureDescription, setNewFeatureDescription] = useState('')
  const [newFeaturePrompt, setNewFeaturePrompt] = useState('')

  useEffect(() => {
    const results = fuzzysort.go(searchQuery, availableFeatures, {
      keys: ['feature_name', 'feature_description'],
    })
    setFilteredFeatures(
      searchQuery.length ? results.map((result) => result.obj) : availableFeatures,
    )
  }, [searchQuery, availableFeatures])

  const handleAddNewFeature = () => {
    // Create a new feature object
    const newFeature: Feature = {
      id: '0',
      feature_identifier: `new_${Date.now()}`, // Generate a unique identifier
      feature_name: newFeatureName,
      feature_description: newFeatureDescription,
      selected: true,
      trail: `${newFeatureParent} → ${newFeatureName}`,
      // Add other necessary fields based on your Feature type
    }

    // Update the available features
    setAvailableFeatures([...availableFeatures, newFeature])

    // Reset form fields
    setNewFeatureType('')
    setNewFeatureParent('')
    setNewFeatureName('')
    setNewFeatureDescription('')
    setNewFeaturePrompt('')

    // Switch back to the Select tab
    setActiveTab('select')
  }

  return (
    <dialog ref={dialogRef} className='modal modal-bottom sm:modal-middle'>
      <div className='modal-box'>
        {/* Tabs */}
        <div role='tablist' className='tabs tabs-boxed'>
          <button
            className={`tab tab-bordered ${activeTab === 'select' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('select')}
          >
            Select Features
          </button>
          <button
            className={`tab tab-bordered ${activeTab === 'define' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('define')}
          >
            Define New Feature
          </button>
        </div>

        {activeTab === 'select' && (
          <>
            <div className='mt-4'>
              {/* Select Features Content */}
              <div className='flex justify-between items-center mb-2'>
                <h3 className='font-bold text-md'>Select Features to Add</h3>
                <span className='text-xs text-gray-500'>hover feature for more details</span>
              </div>
              {/* Search Box */}
              <input
                type='text'
                placeholder='Search features...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='input input-md input-bordered w-full mb-2'
              />
              <div className='max-h-80 overflow-y-auto pr-2'>
                {filteredFeatures
                  .filter((feature) => !feature.feature_identifier.endsWith('.parent'))
                  .map((feature, index) => (
                    <div
                      key={`${feature.feature_name}-${index}`}
                      className='flex items-start hover:bg-slate-100 p-1 rounded'
                      title={feature.feature_name}
                      onClick={() => {
                        setAvailableFeatures(
                          availableFeatures.map((f) =>
                            f.feature_identifier === feature.feature_identifier
                              ? { ...f, selected: !f.selected }
                              : f,
                          ),
                        )
                      }}
                    >
                      <div className='flex-grow'>
                        <p>
                          {feature.trail
                            .split(' ← ')
                            .map((part, index, arr) =>
                              index === 0 ? <b key={index}>{part}</b> : ` ← ${part}`,
                            )}
                        </p>
                        <p className='text-xs text-gray-500'>{feature.feature_description}</p>
                      </div>
                      <div className='flex items-center self-center'>
                        <input
                          id={feature.feature_identifier}
                          type='checkbox'
                          checked={feature.selected}
                          onChange={(e) => {
                            e.stopPropagation() // Prevent div's onClick
                            setAvailableFeatures(
                              availableFeatures.map((f) =>
                                f.feature_identifier === feature.feature_identifier
                                  ? { ...f, selected: e.target.checked }
                                  : f,
                              ),
                            )
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
              <div className='modal-action'>
                <button
                  className='btn btn-sm btn-ghost'
                  onClick={() => {
                    setSearchQuery('')
                    setIsFeatureModalOpen(false)
                  }}
                >
                  Close
                </button>
                <button
                  className='btn btn-sm btn-primary'
                  onClick={() => {
                    setSearchQuery('')
                    setIsFeatureModalOpen(false)
                    updateProjectFeatures()
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'define' && (
          <>
            <div className='mt-4'>
              <h3 className='font-bold text-md mb-2'>Define New Feature</h3>

              <label className='label py-1'>
                <span className='label-text'>Feature Type</span>
              </label>
              <select
                className='select select-sm select-bordered w-full mb-2'
                value={newFeatureType}
                onChange={(e) => setNewFeatureType(e.target.value)}
              >
                <option value='' disabled>
                  Select Feature Type
                </option>
                {/* Replace these options with your actual feature types */}
                <option value='text'>Text</option>
                <option value='number'>Number</option>
                <option value='choice'>Multiple Choice</option>
              </select>

              {/* Parent Selection */}
              <label className='label py-1'>
                <span className='label-text'>Parent Feature</span>
              </label>
              <select
                className='select select-sm select-bordered w-full mb-2'
                value={newFeatureParent}
                onChange={(e) => setNewFeatureParent(e.target.value)}
              >
                <option value='' disabled>
                  Select Parent Feature
                </option>
                {availableFeatures
                  .filter((feature) => feature.feature_identifier.endsWith('.parent'))
                  .map((feature) => (
                    <option key={feature.feature_identifier} value={feature.feature_name}>
                      {feature.trail}
                    </option>
                  ))}
              </select>

              <label className='label py-1'>
                <span className='label-text'>Feature Name</span>
              </label>
              <input
                type='text'
                className='input input-sm input-bordered w-full mb-2'
                value={newFeatureName}
                onChange={(e) => setNewFeatureName(e.target.value)}
              />

              <label className='label py-1'>
                <span className='label-text'>Short Description</span>
              </label>
              <input
                type='text'
                className='input input-sm input-bordered w-full mb-2'
                value={newFeatureDescription}
                onChange={(e) => setNewFeatureDescription(e.target.value)}
              />

              {/* Prompt Input */}
              <label className='label py-1'>
                <span className='label-text'>Prompt</span>
              </label>
              <textarea
                className='textarea textarea-sm textarea-bordered w-full mb-2'
                value={newFeaturePrompt}
                onChange={(e) => setNewFeaturePrompt(e.target.value)}
              ></textarea>
              <div className='flex justify-end space-x-2'>
                <button
                  className='btn btn-sm btn-ghost'
                  onClick={() => {
                    setSearchQuery('')
                    setIsFeatureModalOpen(false)
                  }}
                >
                  Close
                </button>
                <button className='btn btn-sm btn-primary' onClick={handleAddNewFeature}>
                  Add Feature
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </dialog>
  )
}

export default SelectFeatures
