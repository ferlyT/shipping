import React, { useState, useRef, useMemo } from 'react'
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
  Platform,
  StatusBar,
} from 'react-native'
import Svg, { Path, Ellipse, Line, Polygon } from 'react-native-svg'
import {
  X,
  RotateCcw,
  Trash2,
  Check,
  Edit3,
  Circle,
  ArrowUpRight,
  FastForward,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useThemeStore } from '@/theme/themeStore'

interface StrokeItem {
  id: string
  tool: 'pen' | 'circle' | 'arrow'
  color: string
  // for pen
  points?: { x: number; y: number }[]
  // for circle
  cx?: number
  cy?: number
  rx?: number
  ry?: number
  // for arrow
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

interface Props {
  visible: boolean
  photoUri: string | null
  photoBase64: string | null
  onSave: (payload: { photoBase64: string; annotationsSvg?: string }) => void
  onClose: () => void
}

const COLORS = [
  { label: 'Merah (Parah)', color: '#EF4444' },
  { label: 'Kuning (Ringan)', color: '#F59E0B' },
  { label: 'Hijau (OK/Segel)', color: '#10B981' },
]

// Helper kalkulasi koordinat segitiga arrowhead panah secara presisi tanpa SVG marker
function getArrowHeadPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  length = 16,
  angleDeg = 28
): string | null {
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 4) return null

  const angle = Math.atan2(dy, dx)
  const rad = (angleDeg * Math.PI) / 180

  const p1 = `${x2.toFixed(1)},${y2.toFixed(1)}`
  const p2 = `${(x2 - length * Math.cos(angle - rad)).toFixed(1)},${(y2 - length * Math.sin(angle - rad)).toFixed(1)}`
  const p3 = `${(x2 - length * Math.cos(angle + rad)).toFixed(1)},${(y2 - length * Math.sin(angle + rad)).toFixed(1)}`

  return `${p1} ${p2} ${p3}`
}

export function PhotoAnnotationModal({
  visible,
  photoUri,
  photoBase64,
  onSave,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets()
  const { colors, mode } = useThemeStore()
  const isDark = mode === 'midnight'

  const [activeTool, setActiveTool] = useState<'pen' | 'circle' | 'arrow'>('circle')
  const [activeColor, setActiveColor] = useState<string>('#EF4444')
  const [strokes, setStrokes] = useState<StrokeItem[]>([])
  const [currentStroke, setCurrentStroke] = useState<StrokeItem | null>(null)

  const [canvasLayout, setCanvasLayout] = useState<{ width: number; height: number }>({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
  })

  // Refs for gesture handling
  const activeToolRef = useRef(activeTool)
  activeToolRef.current = activeTool
  const activeColorRef = useRef(activeColor)
  activeColorRef.current = activeColor

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt: GestureResponderEvent) => {
          const { locationX, locationY } = evt.nativeEvent
          const tool = activeToolRef.current
          const color = activeColorRef.current

          if (tool === 'pen') {
            setCurrentStroke({
              id: String(Date.now()),
              tool: 'pen',
              color,
              points: [{ x: locationX, y: locationY }],
            })
          } else if (tool === 'circle') {
            setCurrentStroke({
              id: String(Date.now()),
              tool: 'circle',
              color,
              cx: locationX,
              cy: locationY,
              rx: 2,
              ry: 2,
            })
          } else if (tool === 'arrow') {
            setCurrentStroke({
              id: String(Date.now()),
              tool: 'arrow',
              color,
              x1: locationX,
              y1: locationY,
              x2: locationX,
              y2: locationY,
            })
          }
        },
        onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const { locationX, locationY } = evt.nativeEvent
          const tool = activeToolRef.current

          setCurrentStroke((prev) => {
            if (!prev) return null
            if (tool === 'pen' && prev.points) {
              return {
                ...prev,
                points: [...prev.points, { x: locationX, y: locationY }],
              }
            } else if (tool === 'circle' && prev.cx !== undefined && prev.cy !== undefined) {
              const rx = Math.abs(locationX - prev.cx)
              const ry = Math.abs(locationY - prev.cy)
              return {
                ...prev,
                rx: Math.max(10, rx),
                ry: Math.max(10, ry),
              }
            } else if (tool === 'arrow') {
              return {
                ...prev,
                x2: locationX,
                y2: locationY,
              }
            }
            return prev
          })
        },
        onPanResponderRelease: () => {
          setCurrentStroke((finalStroke) => {
            if (finalStroke) {
              Haptics.selectionAsync()
              setStrokes((prev) => [...prev, finalStroke])
            }
            return null
          })
        },
      }),
    []
  )

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setStrokes((prev) => prev.slice(0, prev.length - 1))
  }

  const handleClear = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    setStrokes([])
  }

  const generateSvgString = () => {
    if (strokes.length === 0) return undefined
    const { width, height } = canvasLayout

    const strokeElements = strokes
      .map((s) => {
        if (s.tool === 'pen' && s.points && s.points.length > 0) {
          const d = s.points
            .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
            .join(' ')
          return `<path d="${d}" stroke="${s.color}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
        } else if (s.tool === 'circle' && s.cx !== undefined && s.cy !== undefined) {
          return `<ellipse cx="${s.cx.toFixed(1)}" cy="${s.cy.toFixed(1)}" rx="${(s.rx || 10).toFixed(1)}" ry="${(s.ry || 10).toFixed(1)}" stroke="${s.color}" stroke-width="4.5" fill="${s.color}22" />`
        } else if (s.tool === 'arrow' && s.x1 !== undefined && s.y1 !== undefined) {
          const x2 = s.x2 ?? s.x1
          const y2 = s.y2 ?? s.y1
          const headPoints = getArrowHeadPoints(s.x1, s.y1, x2, y2, 16, 28)
          const lineSvg = `<line x1="${s.x1.toFixed(1)}" y1="${s.y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${s.color}" stroke-width="4.5" stroke-linecap="round" />`
          const headSvg = headPoints ? `<polygon points="${headPoints}" fill="${s.color}" />` : ''
          return `${lineSvg}\n${headSvg}`
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')

    return `<svg width="${Math.round(width)}" height="${Math.round(height)}" viewBox="0 0 ${Math.round(width)} ${Math.round(height)}" xmlns="http://www.w3.org/2000/svg">
      ${strokeElements}
    </svg>`
  }

  const handleSaveWithAnnotation = () => {
    if (!photoBase64) return
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const svg = generateSvgString()
    onSave({
      photoBase64,
      annotationsSvg: svg,
    })
    setStrokes([])
  }

  const handleSkipAnnotation = () => {
    if (!photoBase64) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onSave({
      photoBase64,
      annotationsSvg: undefined,
    })
    setStrokes([])
  }

  if (!visible || !photoUri) return null

  const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes

  const topPadding = Platform.OS === 'android'
    ? Math.max(insets.top, StatusBar.currentHeight ?? 24) + 6
    : Math.max(insets.top, 16) + 4

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.root, { backgroundColor: '#0B0F17' }]}>
        {/* Top Header Bar */}
        <View style={[styles.topBar, { paddingTop: topPadding }]}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <X size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={styles.topBarTitle}>Tandai Kerusakan Kargo</Text>
            <Text style={styles.topBarSub}>Coretan, lingkaran, atau panah</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              onPress={handleUndo}
              disabled={strokes.length === 0}
              style={[styles.iconBtn, strokes.length === 0 && { opacity: 0.4 }]}
            >
              <RotateCcw size={17} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClear}
              disabled={strokes.length === 0}
              style={[styles.iconBtn, strokes.length === 0 && { opacity: 0.4 }]}
            >
              <Trash2 size={17} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Center Drawing Canvas */}
        <View
          style={styles.canvasContainer}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout
            setCanvasLayout({ width, height })
          }}
        >
          {/* Base Photo Image */}
          <Image
            source={{ uri: photoUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />

          {/* SVG Annotation Drawing Layer */}
          <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
            <Svg width={canvasLayout.width} height={canvasLayout.height}>
              {allStrokes.map((s) => {
                if (s.tool === 'pen' && s.points && s.points.length > 0) {
                  const d = s.points
                    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ')
                  return (
                    <Path
                      key={s.id}
                      d={d}
                      stroke={s.color}
                      strokeWidth={5}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )
                } else if (s.tool === 'circle' && s.cx !== undefined && s.cy !== undefined) {
                  return (
                    <Ellipse
                      key={s.id}
                      cx={s.cx}
                      cy={s.cy}
                      rx={s.rx || 10}
                      ry={s.ry || 10}
                      stroke={s.color}
                      strokeWidth={4.5}
                      fill={`${s.color}22`}
                    />
                  )
                } else if (s.tool === 'arrow' && s.x1 !== undefined && s.y1 !== undefined) {
                  const x2 = s.x2 ?? s.x1
                  const y2 = s.y2 ?? s.y1
                  const headPoints = getArrowHeadPoints(s.x1, s.y1, x2, y2, 16, 28)
                  return (
                    <React.Fragment key={s.id}>
                      <Line
                        x1={s.x1}
                        y1={s.y1}
                        x2={x2}
                        y2={y2}
                        stroke={s.color}
                        strokeWidth={4.5}
                        strokeLinecap="round"
                      />
                      {headPoints ? (
                        <Polygon points={headPoints} fill={s.color} />
                      ) : null}
                    </React.Fragment>
                  )
                }
                return null
              })}
            </Svg>
          </View>
        </View>

        {/* Bottom Toolbar & Controls (Terproteksi Navigasi Bar Android) */}
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom:
                Platform.OS === 'android'
                  ? Math.max(insets.bottom, 48) + 16
                  : Math.max(insets.bottom, 20),
            },
          ]}
        >
          {/* Tool Selector Row */}
          <View style={styles.toolsRow}>
            {/* Tool 1: Pen */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync()
                setActiveTool('pen')
              }}
              style={[
                styles.toolBtn,
                activeTool === 'pen' && styles.toolBtnActive,
              ]}
            >
              <Edit3 size={15} color={activeTool === 'pen' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.toolBtnText, activeTool === 'pen' && styles.toolBtnTextActive]}>
                Pen
              </Text>
            </TouchableOpacity>

            {/* Tool 2: Circle */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync()
                setActiveTool('circle')
              }}
              style={[
                styles.toolBtn,
                activeTool === 'circle' && styles.toolBtnActive,
              ]}
            >
              <Circle size={15} color={activeTool === 'circle' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.toolBtnText, activeTool === 'circle' && styles.toolBtnTextActive]}>
                Lingkaran
              </Text>
            </TouchableOpacity>

            {/* Tool 3: Arrow */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync()
                setActiveTool('arrow')
              }}
              style={[
                styles.toolBtn,
                activeTool === 'arrow' && styles.toolBtnActive,
              ]}
            >
              <ArrowUpRight size={15} color={activeTool === 'arrow' ? '#FFFFFF' : '#94A3B8'} />
              <Text style={[styles.toolBtnText, activeTool === 'arrow' && styles.toolBtnTextActive]}>
                Panah
              </Text>
            </TouchableOpacity>

            {/* Color Palette */}
            <View style={styles.colorPalette}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c.color}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setActiveColor(c.color)
                  }}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c.color },
                    activeColor === c.color && styles.colorDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Action CTAs: Skip vs Save */}
          <View style={styles.ctaRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleSkipAnnotation}
              style={[styles.skipBtn, { borderColor: '#222C38', backgroundColor: '#131A23' }]}
            >
              <Text style={[styles.skipBtnText, { color: '#EEF2F6' }]}>Lewati anotasi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSaveWithAnnotation}
              style={[styles.saveBtn, { backgroundColor: '#E0644E', borderColor: '#E0644E' }]}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Unggah foto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  topBarTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  topBarSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  bottomBar: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  toolBtnActive: {
    backgroundColor: '#0284C7',
    borderColor: '#38BDF8',
  },
  toolBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  toolBtnTextActive: {
    color: '#FFFFFF',
  },
  colorPalette: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skipBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
