import { Position } from '@xyflow/react'

import { buildHandle } from '../handle'
import { DEFAULT_BLOCK_CONNECTOR_Y, DEFAULT_BLOCK_CONNECTOR_Y_OFFSET, DEFAULT_BLOCK_WIDTH } from './constants'
import type { BlockVariant } from './types'

const validateVariableType = (selectedType: string, expectedType: string): { isValid: boolean } => ({
  isValid: selectedType.toUpperCase() === expectedType.toUpperCase(),
})

export const getBlockSize = (
  variant: BlockVariant,
  handlePosition: {
    x: number
    y: number
  },
) => {
  const inputConnectors = variant.variables
    .filter((variable) => variable.class === 'input' || variable.class === 'inOut')
    .map((variable) => variable.name)
  const outputConnectors = variant.variables
    .filter((variable) => variable.class === 'output' || variable.class === 'inOut')
    .map((variable) => variable.name)

  const blockHeight =
    DEFAULT_BLOCK_CONNECTOR_Y +
    24 +
    Math.max(inputConnectors.length - 1, outputConnectors.length - 1) * DEFAULT_BLOCK_CONNECTOR_Y_OFFSET

  let variableInputWidth = 0
  let variableOutputWidth = 0
  const blockNameWidth = variant.name.length * 12
  inputConnectors.forEach((input) => {
    const inputWidth = input.length * 12
    if (inputWidth > variableInputWidth) variableInputWidth = inputWidth
  })
  outputConnectors.forEach((output) => {
    const outputWidth = output.length * 12
    if (outputWidth > variableOutputWidth) variableOutputWidth = outputWidth
  })

  const blockWidth = Math.min(
    Math.max(variableInputWidth + 18 + variableOutputWidth, blockNameWidth),
    DEFAULT_BLOCK_WIDTH,
  )

  const leftHandles = inputConnectors.map((connector, index) =>
    buildHandle({
      id: `${connector}`,
      position: Position.Left,
      type: 'target',
      isConnectable: false,
      glbX: handlePosition.x,
      glbY: handlePosition.y + index * DEFAULT_BLOCK_CONNECTOR_Y_OFFSET,
      relX: 0,
      relY: DEFAULT_BLOCK_CONNECTOR_Y + index * DEFAULT_BLOCK_CONNECTOR_Y_OFFSET,
      style: {
        top: DEFAULT_BLOCK_CONNECTOR_Y + index * DEFAULT_BLOCK_CONNECTOR_Y_OFFSET,
        left: 0,
      },
    }),
  )

  const rightHandles = outputConnectors.map((connector, index) =>
    buildHandle({
      id: `${connector}`,
      position: Position.Right,
      type: 'source',
      isConnectable: false,
      glbX: handlePosition.x + blockWidth,
      glbY: handlePosition.y + index * DEFAULT_BLOCK_CONNECTOR_Y_OFFSET,
      relX: blockWidth,
      relY: DEFAULT_BLOCK_CONNECTOR_Y + index * DEFAULT_BLOCK_CONNECTOR_Y_OFFSET,
      style: {
        top: DEFAULT_BLOCK_CONNECTOR_Y + index * DEFAULT_BLOCK_CONNECTOR_Y_OFFSET,
        right: 0,
      },
    }),
  )

  const handles = [...leftHandles, ...rightHandles]

  return {
    handles,
    leftHandles,
    rightHandles,
    height: blockHeight,
    width: blockWidth,
  }
}

export const getBlockVariantAndExecutionControl = (variantLib: BlockVariant, executionControl: boolean) => {
  const inputConnectors = variantLib.variables
    .filter((variable) => variable.class === 'input' || variable.class === 'inOut')
    .map((variable) => ({
      name: variable.name,
      type: variable.type,
    }))
  const outputConnectors = variantLib.variables
    .filter((variable) => variable.class === 'output' || variable.class === 'inOut')
    .map((variable) => ({
      name: variable.name,
      type: variable.type,
    }))

  const mustHaveExecutionControlEnabled =
    inputConnectors.length === 0 ||
    !validateVariableType('BOOL', inputConnectors[0].type.value.toUpperCase()).isValid ||
    outputConnectors.length === 0 ||
    !validateVariableType('BOOL', outputConnectors[0].type.value.toUpperCase()).isValid

  const existingEN = variantLib.variables.find((v) => v.name === 'EN')
  const existingENO = variantLib.variables.find((v) => v.name === 'ENO')
  const others = variantLib.variables.filter((v) => v.name !== 'EN' && v.name !== 'ENO')

  let newVariables = others
  if (executionControl || mustHaveExecutionControlEnabled) {
    const EN = existingEN || {
      name: 'EN',
      class: 'input',
      type: { definition: 'generic-type', value: 'BOOL' },
    }
    const ENO = existingENO || {
      name: 'ENO',
      class: 'output',
      type: { definition: 'generic-type', value: 'BOOL' },
    }
    newVariables = [EN, ENO, ...others]
  }

  return {
    variant: { ...variantLib, variables: newVariables },
    executionControl: executionControl || mustHaveExecutionControlEnabled,
    lockExecutionControl: mustHaveExecutionControlEnabled,
  }
}

