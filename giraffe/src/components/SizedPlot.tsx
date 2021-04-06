import React, {
  CSSProperties,
  FunctionComponent,
  RefObject,
  useCallback,
} from 'react'

import {Axes} from './Axes'
import {
  AnnotationLayerConfig,
  BandLayerConfig,
  InteractionHandlerArguments,
    LayerSpec,
  LayerTypes,
  LineLayerConfig,
    LineData,
  MosaicLayerConfig,
  RectLayerConfig,
  ScatterLayerConfig,
  SingleStatLayerConfig,
  SizedConfig,
  SpecTypes,
} from '../types'

import {SingleStatLayer} from './SingleStatLayer'
import {LineLayer} from './LineLayer'
import {BandLayer} from './BandLayer'
import {ScatterLayer} from './ScatterLayer'
import {RectLayer} from './RectLayer'
import {Brush} from './Brush'
import {rangeToDomain} from '../utils/brush'
import {usePlotEnv} from '../utils/usePlotEnv'
import {useMousePos} from '../utils/useMousePos'
import {useDragEvent} from '../utils/useDragEvent'
import {useForceUpdate} from '../utils/useForceUpdate'
import {LatestValueTransform} from './LatestValueTransform'
import {newTableFromConfig} from '../utils/newTable'
import {MosaicLayer} from './MosaicLayer'
import {GeoLayerConfig} from '../types/geo'
import GeoLayer from './GeoLayer'
import {AnnotationLayer} from './AnnotationLayer'
import {PlotEnv} from "../utils/PlotEnv";

export interface SizedPlotProps {
  config: SizedConfig
  axesCanvasRef: RefObject<HTMLCanvasElement>
  layerCanvasRef: RefObject<HTMLCanvasElement>
  env?:PlotEnv
  spec?:LayerSpec
}

export const SizedPlot: FunctionComponent<SizedPlotProps> = ({
  config: userConfig,
  children,
  axesCanvasRef,
  layerCanvasRef,
}) => {
  const env = usePlotEnv(userConfig)
  const forceUpdate = useForceUpdate()
  const [hoverEvent, hoverTargetProps] = useMousePos()
  const [dragEvent, dragTargetProps] = useDragEvent()
  const hoverX = dragEvent ? null : hoverEvent.x
  const hoverY = dragEvent ? null : hoverEvent.y

  const handleXBrushEnd = useCallback(
    (xRange: number[]) => {
      env.xDomain = rangeToDomain(xRange, env.xScale, env.innerWidth)
      forceUpdate()
    },
    [env.xScale, env.innerWidth, forceUpdate]
  )

  const handleYBrushEnd = useCallback(
    (yRange: number[]) => {
      env.yDomain = rangeToDomain(yRange, env.yScale, env.innerHeight).reverse()
      forceUpdate()
    },
    [env.yScale, env.innerHeight, forceUpdate]
  )

  const {margins, config} = env
  const {width, height, showAxes} = config

  const resetDomains = env => {
    env.resetDomains()
    forceUpdate()
  }

  const memoizedResetDomains = useCallback(() => {
    env.resetDomains()
    forceUpdate()
  }, [env])

  const plotInteraction: InteractionHandlerArguments = {
    hoverX: hoverEvent.x,
    hoverY: hoverEvent.y,
    valueX: env.xScale.invert(hoverEvent.x),
    valueY: env.yScale.invert(hoverEvent.y),
    xDomain: env.xDomain,
    yDomain: env.yDomain,
    resetDomains: () => {
      resetDomains(env)
    },
  }

  const convertLineSpec = (spec) => {
    const mappings = spec?.columnGroupMaps?.fill?.mappings;

    //this is MESSED up.  lineData isn't an array, it's an object with keys from 0->n
    const lineData:LineData = spec?.lineData
 //const colors = [];

    // Object.values(lineData).forEach(value:any => {
    //   colors.push(value.fill)
    // })

    //const colors = Object.values(lineData).map(value=>
    //value.fill)
     Object.values(lineData).forEach(value=>
    {console.log('got value?? ', value?.fill)})

    const colors =  Object.values(lineData).map(value=>
   value?.fill)


    //const colors = spec?.lineData.map(one => one.fill)

//assume all keys are the same

    let objKeys = Object.keys(mappings[0]);

    let result = objKeys.map(key => {

          const values = mappings.map(dataLine =>
              dataLine[key]
          )

          return {
            colors,
            key,
            name: key,
            type: 'string',
            values
          }

        }
    )

    return result
  }

  const noOp = () => {}
  const singleClick = config.interactionHandlers?.singleClick
    ? event => {
        // If a click happens on an annotation line or annotation click handler, don't call the interaction handler.
        // There's already an annotation-specific handler for this, that'll handle this.
        if (
          event.target.classList.contains('giraffe-annotation-click-target') ||
          event.target.classList.contains('giraffe-annotation-line')
        ) {
          return
        }

        config.interactionHandlers.singleClick(plotInteraction)
      }
    : noOp

  if (config.interactionHandlers?.hover) {
    config.interactionHandlers.hover(plotInteraction)
  }

  const callbacks = {
    singleClick,
  }

  const fullsizeStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }

  function renderCustomLayer(layerIndex: number, layerConfig, width, height) {
    const renderProps = {
      key: layerIndex,
      width,
      height,
      innerWidth: env.innerWidth,
      innerHeight: env.innerHeight,
      xScale: env.xScale,
      yScale: env.yScale,
      xDomain: env.xDomain,
      yDomain: env.yDomain,
      columnFormatter: env.getFormatterForColumn,
      yColumnType: env.yColumnType,
    }

    return layerConfig.render(renderProps)
  }

  function makeGraphLayer(layerIndex: number, layerConfig) {
    const spec = env.getSpec(layerIndex)

    console.log('just made spec: ', spec)


    const sharedProps = {
      hoverX,
      hoverY,
      plotConfig: config,
      xScale: env.xScale,
      yScale: env.yScale,
      width: env.innerWidth,
      height: env.innerHeight,
      yColumnType: spec.yColumnType,
      columnFormatter: env.getFormatterForColumn,
    }

    switch (spec.type) {
      case SpecTypes.Annotation:
        return (
          <AnnotationLayer
            key={layerIndex}
            {...sharedProps}
            spec={spec}
            config={layerConfig as AnnotationLayerConfig}
          />
        )
      case SpecTypes.Line:

        //convert it here:
          const staticTooltipData = convertLineSpec(spec)
          console.log('got line spec: (converted (1))', staticTooltipData)
        return (
          <LineLayer
            canvasRef={layerCanvasRef}
            key={layerIndex}
            {...sharedProps}
            spec={spec}
            config={layerConfig as LineLayerConfig}
          />
        )

      case SpecTypes.Band:
        return (
          <BandLayer
            canvasRef={layerCanvasRef}
            key={layerIndex}
            {...sharedProps}
            spec={spec}
            config={layerConfig as BandLayerConfig}
          />
        )

      case SpecTypes.Scatter:
        return (
          <ScatterLayer
            key={layerIndex}
            {...sharedProps}
            spec={spec}
            config={layerConfig as ScatterLayerConfig}
          />
        )

      case SpecTypes.Rect:
        return (
          <RectLayer
            canvasRef={layerCanvasRef}
            key={layerIndex}
            {...sharedProps}
            spec={spec}
            config={layerConfig as RectLayerConfig}
          />
        )

      case SpecTypes.Mosaic: {
        return (
          <MosaicLayer
            key={layerIndex}
            {...sharedProps}
            spec={spec}
            config={layerConfig as MosaicLayerConfig}
          />
        )
      }

      default:
        return null
    }
  }

  // for single clicking; using mouseup, since the onClick only gets through
  // with a double click; and the hover and drag target does not use a mouse up;
  // they are:  hover:  mouseEnter, mousemove, mouseleave
  //            drag target: mouseDown
  // and every time there is a single click, the mouse goes up.  so using that instead.

  return (
    <div
      className="giraffe-plot"
      style={{
        position: 'relative',
        width: `${width}px`,
        height: `${height}px`,
        userSelect: 'none',
      }}
    >
      {showAxes && (
        <Axes env={env} canvasRef={axesCanvasRef} style={fullsizeStyle} />
      )}
      <div
        className="giraffe-inner-plot"
        data-testid="giraffe-inner-plot"
        style={{
          position: 'absolute',
          top: `${margins.top}px`,
          right: `${margins.right}px`,
          bottom: `${margins.bottom}px`,
          left: `${margins.left}px`,
          cursor: `${userConfig.cursor || 'crosshair'}`,
        }}
        onMouseUp={callbacks.singleClick}
        onDoubleClick={memoizedResetDomains}
        {...hoverTargetProps}
        {...dragTargetProps}
      >
        <div className="giraffe-layers" style={fullsizeStyle}>
          {config.layers.map((layerConfig, layerIndex) => {
            if (layerConfig.type === LayerTypes.Geo) {
              return (
                <GeoLayer
                  key={layerIndex}
                  table={newTableFromConfig(config)}
                  config={layerConfig as GeoLayerConfig}
                  plotConfig={config}
                />
              )
            }

            if (layerConfig.type === LayerTypes.Custom) {
              return renderCustomLayer(layerIndex, layerConfig, width, height)
            }

            if (layerConfig.type === LayerTypes.SingleStat) {
              return (
                <LatestValueTransform
                  key={layerIndex}
                  table={newTableFromConfig(config)}
                  allowString={true}
                >
                  {latestValue => (
                    <SingleStatLayer
                      stat={latestValue}
                      config={layerConfig as SingleStatLayerConfig}
                    />
                  )}
                </LatestValueTransform>
              )
            }

            return makeGraphLayer(layerIndex, layerConfig)
          })}
          {children && children}
        </div>
        <Brush
          event={dragEvent}
          width={env.innerWidth}
          height={env.innerHeight}
          onXBrushEnd={handleXBrushEnd}
          onYBrushEnd={handleYBrushEnd}
        />
      </div>
    </div>
  )
}

SizedPlot.displayName = 'SizedPlot'
