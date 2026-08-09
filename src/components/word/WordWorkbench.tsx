import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import {
  DndContext,
  pointerWithin,
  useDraggable,
  useDroppable,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useWordStore } from '../../stores/wordStore'
import { useViewStore } from '../../stores/viewStore'
import { getDefinitions } from '../../services/fieldService'
import { formatPhonetic } from '../../lib/phonetic'
import { sortTreeByTemplate, ROOT_FIELD_KEYS, ALLOWED_CHILD_KEYS } from '../../lib/fieldOrder'
import { hasFieldChanges } from '../../lib/fieldChanges'
import { Button } from '../ui/Button'
import EmptyState from '../ui/EmptyState'
import Icon from '../icons'
import CategoryCapsule from './CategoryCapsule'
import { useCategoryStore } from '../../stores/categoryStore'
import { useUiStore } from '../../stores/uiStore'
import type { FieldDefinition, FieldValue } from '../../types/field'

type FieldState = 'original' | 'edited' | 'personal'
const fieldState = (fv: FieldValue): FieldState =>
  fv.edited ? 'edited' : (fv.source === 'user' ? 'personal' : 'original')

const FIELD_STYLES: Record<FieldState, CSSProperties> = {
  original: { background: 'var(--color-surface-sunken)', border: '1px solid var(--color-border)', borderLeft: '3px solid var(--color-weave-original)' },
  edited:   { background: 'var(--color-brand-softer)',  border: '1px solid var(--color-brand-soft)',  borderLeft: '3px solid var(--color-weave-edited)' },
  personal: { background: 'var(--color-accent-soft)',   border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',      borderLeft: '3px solid var(--color-weave-personal)' },
}

// 容器字段（#5 键判定，取代「有子级且无值」推断：刚建的空容器立即按容器渲染）
const CONTAINER_FIELD_KEYS = ['part_of_speech', 'supplementary', 'phrase', 'exchange', 'derivatives', 'example_sentence', 'synonyms']
// 项类型字段（#4）：标签列不渲染字段名，值占满整行
const ITEM_FIELD_KEYS = ['exchange_item', 'supplementary_item', 'phrase_item', 'derivatives_item', 'synonym_item', 'example']

// 「更多操作」菜单项统一样式（#6）
const menuItemStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '6px 10px',
  border: 'none',
  background: 'transparent',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  color: 'var(--color-text-primary)',
  fontSize: 'var(--text-sm)',
  fontFamily: 'var(--font-sans)',
  whiteSpace: 'nowrap',
  transition: 'background-color var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
}

interface InsertIndicator {
  overId: string
  before: boolean
}

interface FieldCardProps {
  fv: FieldValue
  depth: number
  defs: FieldDefinition[]
  editorMode: boolean
  editingId: string | null
  editValue: string
  menuOpenId: string | null
  insertIndicator: InsertIndicator | null
  onStartEdit: (fv: FieldValue) => void
  onEditValueChange: (value: string) => void
  onSave: () => void
  onCancelEdit: () => void
  onToggleMenu: (id: string) => void
  onAddChild: (parentFv: FieldValue, childDef: FieldDefinition) => void
  onDelete: (fv: FieldValue) => void
  childMenuId: string | null
  onToggleChildMenu: (id: string) => void
  labelOverride?: string | null
}

// 单个字段卡片：grip 拖拽（仅 grip 激活拖拽，点击/编辑不受影响）+ 同级插入指示线（规格 §5.5）
function FieldCard({ fv, depth, ...rest }: FieldCardProps) {
  const {
    defs, editorMode, editingId, editValue, menuOpenId, insertIndicator,
    onStartEdit, onEditValueChange, onSave, onCancelEdit, onToggleMenu,
    onAddChild, onDelete, childMenuId, onToggleChildMenu, labelOverride,
  } = rest
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: fv.id })
  const { setNodeRef: setDropRef } = useDroppable({ id: `drop-${fv.id}` })
  const setRefs = useCallback((node: HTMLElement | null) => {
    setNodeRef(node)
    setDropRef(node)
  }, [setNodeRef, setDropRef])

  const def = defs.find(d => d.id === fv.fieldId)
  if (!def) return null

  const hasChildren = fv.children && fv.children.length > 0
  const isContainer = CONTAINER_FIELD_KEYS.includes(def.key)
  // 标签列文本（#4）：项类型字段不渲染字段名，值占满整行；词性子级用 override
  const labelText = labelOverride ?? (ITEM_FIELD_KEYS.includes(def.key) ? '' : def.name)
  // 词性父：规则线块状窗格（spec §6.1）；词性父不使用 FIELD_STYLES/isLevel1 普通卡样式，窗格样式优先
  const isPosPane = def.key === 'part_of_speech'
  const posChildren = fv.children ?? []
  const childKey = (c: FieldValue) => defs.find(d => d.id === c.fieldId)?.key ?? ''
  const zhCount = posChildren.filter(c => childKey(c) === 'chinese_definition').length
  const enCount = posChildren.filter(c => childKey(c) === 'english_definition').length
  // 词性窗格样式（#1）：两种模式统一中性色，品牌蓝仅保留给「已编辑」字段状态语义
  const paneStyle: CSSProperties = isPosPane
    ? {
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        borderLeft: '3px solid var(--color-border-strong)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        marginBottom: '6px',
        position: 'relative',
        transition: 'background-color 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth)',
      }
    : {}
  const isEditing = editingId === fv.id
  const isLevel1 = depth === 0
  const isPhonetic = def.key === 'phonetic'
  // 子词条菜单（Task 10 §Step 2）：依据 ALLOWED_CHILD_KEYS 过滤可选子字段（spec §3.2）
  const allowedChildKeys = ALLOWED_CHILD_KEYS[def.key] ?? []
  const childDefs = defs.filter(d => allowedChildKeys.includes(d.key))
  const childMenuLabel = def.key === 'part_of_speech'
    ? '添加释义'
    : (def.key === 'chinese_definition' || def.key === 'english_definition')
      ? '添加子词条'
      : '添加项'
  const state = fieldState(fv)
  const draggingStyle = isDragging ? { transform: 'scale(1.02)', boxShadow: 'var(--shadow-raised)' } : null

  // ②a：叶子容器（子项均为终端项）不渲染树状分支/连接横线，子项平铺成无框列表
  const hasTerminalChildren = hasChildren && fv.children!.every(c => !(c.children && c.children.length > 0))
  const renderedChildren = hasChildren
    ? hasTerminalChildren
      ? fv.children!.map(child => (
          <FieldCard key={child.id} fv={child} depth={depth + 1} {...rest} labelOverride={null} />
        ))
      : (() => {
          let zhNum = 0
          let enNum = 0
          return fv.children!.map(child => {
            const cKey = childKey(child)
            let labelOverride: string | null = null
            if (isPosPane) {
              if (cKey === 'chinese_definition') { zhNum += 1; labelOverride = `中文释义(${zhNum})` }
              else if (cKey === 'english_definition') { enNum += 1; labelOverride = `英文释义(${enNum})` }
            }
            return (
              <div key={child.id} style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute', left: '-8px', top: '12px', width: '8px',
                    borderTop: '1px solid var(--color-border)', pointerEvents: 'none',
                  }}
                />
                <FieldCard fv={child} depth={depth + 1} {...rest} labelOverride={labelOverride} />
              </div>
            )
          })
        })()
    : null

  // 普通模式「更多操作」三点（按钮 + 下拉菜单）：叶子/容器复用同一 JSX，仅包装位置不同
  const threeDotMenu = (
    <>
      <button
        type="button"
        title="更多操作"
        aria-label="更多操作"
        onClick={() => onToggleMenu(fv.id)}
        className="opacity-0 group-hover:opacity-100"
        style={{
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          color: 'var(--color-text-tertiary)',
          transition: 'opacity var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
        }}
      >
        <Icon name="more" size={16} />
      </button>
      {menuOpenId === fv.id && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            minWidth: '120px',
            padding: '4px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-overlay)',
            zIndex: 'var(--z-dropdown)',
          }}
        >
          {!isContainer && (
            <button
              type="button"
              onClick={() => { onToggleMenu(fv.id); onStartEdit(fv) }}
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-brand)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
            >
              编辑
            </button>
          )}
          {childDefs.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => onToggleChildMenu(fv.id)}
                style={menuItemStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-brand)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
              >
                添加子词条
              </button>
              {childMenuId === fv.id && childDefs.map(childDef => (
                <button
                  key={childDef.id}
                  type="button"
                  onClick={() => onAddChild(fv, childDef)}
                  style={{ ...menuItemStyle, paddingLeft: '20px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-brand)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
                >
                  {childDef.name}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => onDelete(fv)}
            style={{ ...menuItemStyle, color: 'var(--color-danger)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger) 10%, transparent)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            删除
          </button>
        </div>
      )}
    </>
  )

  return (
    <div
      ref={setRefs}
      className="group"
      data-field-edit={isEditing ? 'true' : undefined}
      style={
        isPosPane
          ? { ...paneStyle, ...draggingStyle }
          : editorMode
            ? {
                ...FIELD_STYLES[state],
                borderRadius: 'var(--radius-md)',
                padding: isLevel1 ? '8px' : '6px 12px',
                marginBottom: '2px',
                transition: 'background-color 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth)',
                position: 'relative',
                ...draggingStyle,
              }
            : {
                background: isLevel1 ? 'var(--color-surface-raised)' : 'transparent',
                border: isLevel1 ? '1px solid var(--color-border)' : 'none',
                borderRadius: 'var(--radius-md)',
                padding: isLevel1 ? '8px' : '6px 12px',
                marginBottom: isLevel1 ? '2px' : '0',
                transition: 'background-color 200ms var(--ease-smooth), border-color 200ms var(--ease-smooth)',
                position: 'relative',
                ...draggingStyle,
              }
      }
    >
      {insertIndicator && insertIndicator.overId === fv.id && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: insertIndicator.before ? -2 : undefined,
            bottom: insertIndicator.before ? undefined : -2,
            height: '2px',
            background: 'var(--color-brand)',
            borderRadius: '1px',
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ display: 'flex', alignItems: isPosPane ? 'center' : 'baseline', gap: '8px' }}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          title="拖动排序"
          aria-label="拖动排序"
          className="opacity-0 group-hover:opacity-100"
          style={{
            width: '16px',
            height: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--radius-sm)',
            cursor: isDragging ? 'grabbing' : 'grab',
            color: 'var(--color-text-tertiary)',
            flexShrink: 0,
            alignSelf: 'center',
            touchAction: 'none',
            transition: 'opacity var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
          }}
        >
          <Icon name="grip" size={14} />
        </button>
        {isPosPane ? (
          isEditing ? (
            <div className="space-y-2" style={{ flex: 1 }}>
              <input
                className="w-full px-3 py-1.5 rounded text-sm"
                style={{
                  border: '1px solid var(--color-brand)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-surface)',
                  transition: `transform var(--duration-fast) var(--ease-smooth)`,
                  transform: 'scale(1.005)',
                }}
                value={editValue}
                onChange={e => onEditValueChange(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button onClick={onSave}>保存</Button>
                <Button variant="secondary" onClick={onCancelEdit}>取消</Button>
              </div>
            </div>
          ) : (
            <>
              <span
                onClick={() => editorMode && onStartEdit(fv)}
                onDoubleClick={() => !editorMode && onStartEdit(fv)}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStartEdit(fv) }
                }}
                title={editorMode ? '点击编辑词性标签' : '双击编辑词性标签'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '20px',
                  padding: '0 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  background: 'transparent',
                  color: 'var(--color-pos)',
                  border: '1.5px solid var(--color-pos)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                {def.name} {fv.value}
              </span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-tertiary)',
                  whiteSpace: 'nowrap',
                }}
              >
                中文×{zhCount} · 英文×{enCount}
              </span>
            </>
          )
        ) : (
          <>
            {labelText && (
              <span
                style={{
                  width: isLevel1 ? '100px' : 'auto',
                  minWidth: isLevel1 ? undefined : '80px',
                  flexShrink: 0,
                  fontSize: isLevel1 ? 'var(--text-sm)' : 'var(--text-xs)',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {labelText}
              </span>
            )}
            {!isContainer && (
          <div
            style={{
              flex: 1,
              fontSize: 'var(--text-sm)',
              color: editorMode && state === 'original' ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
              lineHeight: isLevel1 ? 'var(--leading-relaxed)' : undefined,
              fontFamily: isPhonetic ? 'var(--font-phonetic)' : undefined,
            }}
          >
            {isEditing ? (
              <div className="space-y-2">
                {def.fieldType === 'multiline' ? (
                  <textarea
                    className="w-full px-3 py-2 rounded text-sm resize-none min-h-[60px]"
                    style={{
                      border: '1px solid var(--color-brand)',
                      color: 'var(--color-text-primary)',
                      background: 'var(--color-surface)',
                      transition: `transform var(--duration-fast) var(--ease-smooth)`,
                      transform: 'scale(1.005)',
                    }}
                    value={editValue}
                    onChange={e => onEditValueChange(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <input
                    className="w-full px-3 py-1.5 rounded text-sm"
                    style={{
                      border: '1px solid var(--color-brand)',
                      color: 'var(--color-text-primary)',
                      background: 'var(--color-surface)',
                      transition: `transform var(--duration-fast) var(--ease-smooth)`,
                      transform: 'scale(1.005)',
                    }}
                    value={editValue}
                    onChange={e => onEditValueChange(e.target.value)}
                    autoFocus
                  />
                )}
                <div className="flex gap-2">
                  <Button onClick={onSave}>保存</Button>
                  <Button variant="secondary" onClick={onCancelEdit}>取消</Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => editorMode && onStartEdit(fv)}
                onDoubleClick={() => !editorMode && onStartEdit(fv)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStartEdit(fv) }
                }}
                role="button"
                tabIndex={0}
                title={editorMode ? '点击编辑' : '双击编辑'}
                style={{ cursor: 'pointer' }}
              >
                {fv.value}
              </div>
            )}
          </div>
            )}
          </>
        )}
        {editorMode ? (
          <>
            {state !== 'original' && (
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 'var(--text-xs)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: state === 'edited' ? 'var(--color-brand-soft)' : 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                  color: state === 'edited' ? 'var(--color-brand)' : 'var(--color-accent)',
                  whiteSpace: 'nowrap',
                }}
              >
                {state === 'edited' ? '已编辑' : '个人'}
              </span>
            )}
            {/* 叶子节点垃圾桶：flex 行末、角标之后（容器节点垃圾桶为卡片右下绝对定位） */}
            {childDefs.length === 0 && (
              <button
                type="button"
                title="删除"
                aria-label="删除"
                onClick={() => onDelete(fv)}
                style={{
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  flexShrink: 0,
                  alignSelf: 'center',
                  transition: 'color var(--duration-fast) var(--ease-smooth)',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
              >
                <Icon name="trash" size={16} />
              </button>
            )}
          </>
        ) : (
          // 普通模式三点：叶子节点保留 flex 行内最右；容器节点移到卡片右上角（见下方卡片直接子级）
          childDefs.length === 0 && (
            <div style={{ position: 'relative', flexShrink: 0, alignSelf: 'center' }}>
              {threeDotMenu}
            </div>
          )
        )}
      </div>
      {/* 容器节点三点：普通模式，卡片直接子级，绝对定位锚定卡片（卡片恒 position: relative）右上角 */}
      {!editorMode && childDefs.length > 0 && (
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 'var(--z-dropdown)' }}>
          {threeDotMenu}
        </div>
      )}
      {/* 容器节点垃圾桶：卡片直接子级，绝对定位锚定卡片（卡片恒 position: relative）右下角，与左下「+ 添加」按钮对侧 */}
      {editorMode && childDefs.length > 0 && (
        <button
          type="button"
          title="删除"
          aria-label="删除"
          onClick={() => onDelete(fv)}
          style={{
            position: 'absolute',
            right: '8px',
            bottom: '8px',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            zIndex: 1,
            transition: 'color var(--duration-fast) var(--ease-smooth)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-tertiary)' }}
        >
          <Icon name="trash" size={16} />
        </button>
      )}
      {hasChildren && (
        <div style={hasTerminalChildren
          ? { marginTop: '4px' }
          : { marginLeft: '6px', paddingLeft: '8px', borderLeft: '1px solid var(--color-border)', marginTop: '8px' }}>
          {renderedChildren}
        </div>
      )}
      {/* 每卡「+ 添加子词条」菜单（Task 10 §Step 2）：编者模式可用，按 ALLOWED_CHILD_KEYS 过滤 */}
      {editorMode && childDefs.length > 0 && (
        <div style={{ position: 'relative', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => onToggleChildMenu(fv.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              border: '1px dashed var(--color-border-strong)',
              borderRadius: 'var(--radius-full)',
              background: 'transparent',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'color var(--duration-fast) var(--ease-smooth), border-color var(--duration-fast) var(--ease-smooth), background-color var(--duration-fast) var(--ease-smooth)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--color-brand)'
              e.currentTarget.style.borderColor = 'var(--color-brand)'
              e.currentTarget.style.background = 'var(--color-brand-softer)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--color-text-tertiary)'
              e.currentTarget.style.borderColor = 'var(--color-border-strong)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Icon name="plus" size={14} />
            {childMenuLabel}
          </button>
          {childMenuId === fv.id && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                bottom: 'calc(100% + 4px)',
                minWidth: '120px',
                padding: '4px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-overlay)',
                zIndex: 'var(--z-dropdown)',
              }}
            >
              {childDefs.map(childDef => (
                <button
                  key={childDef.id}
                  type="button"
                  onClick={() => onAddChild(fv, childDef)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                    transition: 'background-color var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-brand)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
                >
                  {childDef.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function WordWorkbench() {
  const { words, selectedWordId, fieldValues, updateFieldValue, deleteWord, addFieldValue, deleteFieldValue, reorderFieldValues } = useWordStore()
  const [defs, setDefs] = useState<FieldDefinition[]>([])
  const editorMode = useViewStore(s => s.editorMode)
  const setEditorMode = useViewStore(s => s.setEditorMode)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [entryValue, setEntryValue] = useState('')  // 进入编辑时的值
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [childMenuId, setChildMenuId] = useState<string | null>(null)
  const [addFieldOpen, setAddFieldOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [fadeIn, setFadeIn] = useState(true)
  const [insertIndicator, setInsertIndicator] = useState<InsertIndicator | null>(null)
  const [capsuleExpanded, setCapsuleExpanded] = useState(false)

  const { categories, wordCategoryIds, loadWordCategories } = useCategoryStore()
  const { openAssign, openEditor } = useUiStore()

  const selectedWord = words.find(w => w.id === selectedWordId)

  useEffect(() => {
    getDefinitions().then(defs => setDefs(defs))
  }, [])

  // 切换单词自动加载该词分类（规格 §5.1）
  useEffect(() => {
    if (selectedWordId) loadWordCategories(selectedWordId)
  }, [selectedWordId])

  // Cleanup saved state after animation completes
  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 500)
      return () => clearTimeout(timer)
    }
  }, [saved])

  // Fade-in on word switch
  useEffect(() => {
    setFadeIn(false)
    const raf = requestAnimationFrame(() => setFadeIn(true))
    return () => cancelAnimationFrame(raf)
  }, [selectedWordId])

  // Esc 关闭工作台浮层（三点菜单 / 添加子词条 / 添加字段选择器）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpenId(null)
        setChildMenuId(null)
        setAddFieldOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // 内联编辑点外关闭：点击编辑卡外部且未改动时退出编辑（有改动保持，供继续编辑/保存）
  useEffect(() => {
    if (!editingId) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-field-edit]')) return   // 编辑卡内（输入/保存/取消）不处理
      if (!hasFieldChanges(editValue, entryValue)) setEditingId(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [editingId, editValue, entryValue])

  if (!selectedWord) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState message="选择一个单词开始查看" />
      </div>
    )
  }

  const handleStartEdit = (fv: FieldValue) => {
    setEditingId(fv.id)
    setEditValue(fv.value || '')
    setEntryValue(fv.value || '')
  }

  // Recursively find a FieldValue by its id within the tree (root values + nested children)
  const findFieldValueById = (id: string, values: FieldValue[] = fieldValues): FieldValue | undefined => {
    for (const fv of values) {
      if (fv.id === id) return fv
      if (fv.children?.length) {
        const found = findFieldValueById(id, fv.children)
        if (found) return found
      }
    }
    return undefined
  }

  const handleSave = async () => {
    if (!editingId) return
    const fv = findFieldValueById(editingId)
    if (!fv) return
    // 词性空标签校验（Task 10 §Step 4）：词性父必须有非空标签
    if (defKeyByFieldId.get(fv.fieldId) === 'part_of_speech' && !editValue.trim()) {
      window.alert('词性标签不能为空')
      return
    }
    if (editValue === entryValue) { setEditingId(null); return }  // 未真实修改：不置位
    if (fv.source === 'user') {
      await updateFieldValue(fv.id, { value: editValue })  // 个人字段保持 personal
    } else {
      await updateFieldValue(fv.id, {
        value: editValue,
        edited: true,
        originalValue: fv.originalValue ?? entryValue,  // 保留既有 original_value
      })
    }
    setEditingId(null)
    setSaved(true)
  }

  const handleDelete = async () => {
    if (!window.confirm(`确定删除单词“${selectedWord.lemma}”吗？此操作不可撤销。`)) return
    await deleteWord(selectedWord.id)
  }

  // 添加字段：选择定义 → 新增空个人字段 → 自动进入编辑态
  const handleAddField = async (def: FieldDefinition) => {
    setAddFieldOpen(false)
    const fv = await addFieldValue(def.id)
    if (!fv) return
    // 非词性容器无值格可编辑：不进入幻影编辑态（词性有独立标签编辑路径，保留自动进入）
    if (CONTAINER_FIELD_KEYS.includes(def.key) && def.key !== 'part_of_speech') return
    setEditingId(fv.id)
    setEditValue('')
    setEntryValue('')
  }

  // 添加子词条：挂到当前节点下 → 自动进入编辑态（Task 10 §Step 2）
  const handleAddChild = async (parentFv: FieldValue, childDef: FieldDefinition) => {
    setChildMenuId(null)
    setMenuOpenId(null)
    const fv = await addFieldValue(childDef.id, parentFv.id)
    if (!fv) return
    // 子容器（如 definition 下的 example_sentence/synonyms）无值格可编辑：不进入幻影编辑态
    if (CONTAINER_FIELD_KEYS.includes(childDef.key)) return
    setEditingId(fv.id)
    setEditValue('')
    setEntryValue('')
  }

  // 单节点删除：级联确认，含子级时提示删除子树（Task 10 §Step 3）
  const handleDeleteField = async (fv: FieldValue) => {
    setMenuOpenId(null)
    const name = defs.find(d => d.id === fv.fieldId)?.name ?? (fv.value || '字段')
    const hasKids = !!(fv.children && fv.children.length > 0)
    const msg = hasKids
      ? `删除「${name}」及其全部子词条？此操作不可撤销。`
      : `删除「${name}」？此操作不可撤销。`
    if (!window.confirm(msg)) return
    await deleteFieldValue(fv.id)
  }

  // 拖拽重排（规格 §5.5）：仅同级；拖动中卡片缩放+阴影，目标处 2px 品牌色插入线
  const handleDragStart = () => {
    setInsertIndicator(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) { setInsertIndicator(null); return }
    const targetId = String(over.id).replace(/^drop-/, '')
    if (targetId === String(active.id)) { setInsertIndicator(null); return }  // 落在自身
    const dragged = findFieldValueById(String(active.id))
    const target = findFieldValueById(targetId)
    if (!dragged || !target || dragged.parentId !== target.parentId) {  // 仅同级
      setInsertIndicator(null)
      return
    }
    const overRect = over.rect
    const activeTop = active.rect.current.translated?.top ?? 0
    setInsertIndicator({ overId: targetId, before: activeTop < overRect.top + overRect.height / 2 })
  }

  const handleDragCancel = () => {
    setInsertIndicator(null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setInsertIndicator(null)
    const { active, over } = event
    if (!over) return
    const targetId = String(over.id).replace(/^drop-/, '')
    if (targetId === String(active.id)) return  // 落在自身：不重排
    const dragged = findFieldValueById(String(active.id))
    const target = findFieldValueById(targetId)
    if (!dragged || !target || dragged.parentId !== target.parentId) return  // 仅同级重排
    const siblings = (dragged.parentId
      ? (findFieldValueById(dragged.parentId)?.children ?? [])
      : fieldValues.filter(fv => !fv.parentId))
    const without = siblings.filter(s => s.id !== dragged.id)
    const overRect = over.rect
    const activeTop = active.rect.current.translated?.top ?? 0
    const insertBefore = activeTop < overRect.top + overRect.height / 2
    const targetIndex = without.findIndex(s => s.id === target.id)
    without.splice(insertBefore ? targetIndex : targetIndex + 1, 0, dragged)
    await reorderFieldValues(without.map((s, i) => ({ id: s.id, displayOrder: i })))
  }

  // 头部音标：从 fieldValues 经 defs 反查 key 提取（规格 §6.1 标题行仅音标，词性改由窗格展示）
  const defKeyByFieldId = new Map(defs.map(d => [d.id, d.key]))
  const phonetic = fieldValues.find(fv => defKeyByFieldId.get(fv.fieldId) === 'phonetic')?.value
  const showPhoneticRow = Boolean(phonetic)

  // 模板序渲染（spec §4.1）：children 由 getValues 已聚成树，sortTreeByTemplate 递归重排
  const sortedFieldValues = sortTreeByTemplate(
    fv => defKeyByFieldId.get(fv.fieldId) ?? fv.fieldId,
    fieldValues
  )

  const wordCapsules = categories.filter(c => wordCategoryIds.includes(c.id))
  const showMoreCapsules = wordCapsules.length > 4
  const shownCapsules = showMoreCapsules ? wordCapsules.slice(0, 3) : wordCapsules
  const extraCapsules = showMoreCapsules ? wordCapsules.slice(3) : []

  const cardProps: Omit<FieldCardProps, 'fv' | 'depth'> = {
    defs,
    editorMode,
    editingId,
    editValue,
    menuOpenId,
    insertIndicator,
    onStartEdit: handleStartEdit,
    onEditValueChange: setEditValue,
    onSave: handleSave,
    onCancelEdit: () => setEditingId(null),
    onToggleMenu: (id) => setMenuOpenId(menuOpenId === id ? null : id),
    onAddChild: handleAddChild,
    onDelete: handleDeleteField,
    childMenuId,
    onToggleChildMenu: (id) => setChildMenuId(childMenuId === id ? null : id),
  }

  return (
    <div
      style={{
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 100ms var(--ease-smooth)',
        height: '100%',
        overflowY: 'auto',
        background: 'var(--color-surface)',
      }}
    >
      {/* 工作台浮层点外关闭：全屏透明遮罩（三点菜单 / 添加子词条 / 添加字段选择器） */}
      {(menuOpenId || childMenuId || addFieldOpen) && (
        <div
          className="fixed inset-0"
          style={{ zIndex: 'var(--z-base)' }}
          onClick={() => { setMenuOpenId(null); setChildMenuId(null); setAddFieldOpen(false) }}
        />
      )}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 32px 48px' }}>
        {/* 单词标题区（规格 §5.1） */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '6px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {saved && (
                  <div
                    style={{
                      width: '4px',
                      height: '24px',
                      background: 'var(--color-brand)',
                      borderRadius: '2px',
                      animation: 'weave-pulse 500ms var(--ease-smooth)',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 'var(--weight-bold)',
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.2,
                  }}
                >
                  {selectedWord.lemma}
                </div>
              </div>
              {showPhoneticRow && (
                <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
                  {phonetic && <span style={{ fontFamily: 'var(--font-phonetic)' }}>{formatPhonetic(phonetic)}</span>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {shownCapsules.map(cat => (
                <CategoryCapsule
                  key={cat.id}
                  category={cat}
                  onClick={() => openEditor(cat, selectedWord.id)}
                />
              ))}
              {showMoreCapsules && (
                <button
                  type="button"
                  title={capsuleExpanded ? '收起分类' : '展开更多分类'}
                  aria-label={capsuleExpanded ? '收起分类' : '展开更多分类'}
                  onClick={() => setCapsuleExpanded(v => !v)}
                  style={{
                    height: '24px', padding: '0 10px', borderRadius: 'var(--radius-full)',
                    border: '1px dashed var(--color-border-strong)', background: 'transparent',
                    fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'color var(--duration-fast) var(--ease-smooth), border-color var(--duration-fast) var(--ease-smooth)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--color-brand)'
                    e.currentTarget.style.borderColor = 'var(--color-brand)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--color-text-tertiary)'
                    e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                  }}
                >
                  {capsuleExpanded ? '收起' : `+${extraCapsules.length}`}
                </button>
              )}
              {showMoreCapsules && capsuleExpanded && extraCapsules.map(cat => (
                <CategoryCapsule
                  key={cat.id}
                  category={cat}
                  onClick={() => openEditor(cat, selectedWord.id)}
                />
              ))}
              {/* 「+」虚线圆钮：新建/选择分类（规格 §5.1） */}
              <button
                type="button"
                title="添加分类"
                aria-label="添加分类"
                onClick={() => { openAssign(selectedWord.id); setCapsuleExpanded(false) }}
                style={{
                  width: '24px',
                  height: '24px',
                  border: '1px dashed var(--color-border-strong)',
                  borderRadius: 'var(--radius-full)',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)',
                  transition: 'color var(--duration-fast) var(--ease-smooth), border-color var(--duration-fast) var(--ease-smooth)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--color-brand)'
                  e.currentTarget.style.borderColor = 'var(--color-brand)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--color-text-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                }}
              >
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 分割线 */}
        <div style={{ height: '1px', background: 'var(--color-border-strong)', margin: '8px 0' }} />

        {/* 工具栏：编者模式开关（规格 §5.2，交互 Task 6 接入） */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '8px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            <span>编者模式</span>
            <button
              type="button"
              role="switch"
              aria-checked={editorMode}
              aria-label="编者模式"
              onClick={() => { setEditorMode(!editorMode); setMenuOpenId(null); setChildMenuId(null) }}
              style={{
                width: '36px',
                height: '20px',
                background: editorMode ? 'var(--color-brand)' : 'var(--color-border-strong)',
                borderRadius: 'var(--radius-full)',
                position: 'relative',
                flexShrink: 0,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                transition: 'background-color var(--duration-fast) var(--ease-smooth)',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: '2px',
                  width: '16px',
                  height: '16px',
                  background: '#FFFFFF',
                  borderRadius: '50%',
                  transition: 'transform var(--duration-fast) var(--ease-smooth)',
                  transform: editorMode ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
            </button>
          </div>
        </div>

        {/* 字段列表（非编者模式默认：统一微暖背景，无竖线无角标，规格 §5.2/§5.4） */}
        <DndContext
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div style={{ marginTop: '8px' }}>
            {sortedFieldValues.map(fv => (
              <FieldCard key={fv.id} fv={fv} depth={0} {...cardProps} />
            ))}
          </div>
        </DndContext>

        {/* 添加字段（规格 §5.6 + D3）：虚线按钮 + 定义选择器浮层 */}
        <div style={{ position: 'relative', marginTop: '12px' }}>
          <button
            type="button"
            onClick={() => setAddFieldOpen(!addFieldOpen)}
            style={{
              width: '100%',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'color var(--duration-fast) var(--ease-smooth), border-color var(--duration-fast) var(--ease-smooth), background-color var(--duration-fast) var(--ease-smooth)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--color-brand)'
              e.currentTarget.style.borderColor = 'var(--color-brand)'
              e.currentTarget.style.background = 'var(--color-brand-softer)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--color-text-tertiary)'
              e.currentTarget.style.borderColor = 'var(--color-border)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Icon name="plus" size={16} />
            添加字段
          </button>

          {addFieldOpen && (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 'calc(100% + 4px)',
                maxHeight: '240px',
                overflowY: 'auto',
                padding: '4px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-overlay)',
                zIndex: 'var(--z-dropdown)',
              }}
            >
              {/* 根级「+ 添加字段」仅列根级字段（Task 10 §Step 1） */}
              {defs.filter(d => ROOT_FIELD_KEYS.includes(d.key)).map(def => (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => handleAddField(def)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: '6px 10px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                    fontSize: 'var(--text-sm)',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                    transition: 'background-color var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-hover)'; e.currentTarget.style.color = 'var(--color-brand)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
                >
                  {def.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 删除单词（最底部，危险操作，低调次级钮） */}
        <button
          type="button"
          onClick={handleDelete}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            margin: '24px auto 0',
            padding: '6px 12px',
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'color var(--duration-fast) var(--ease-smooth), background-color var(--duration-fast) var(--ease-smooth)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--color-danger)'
            e.currentTarget.style.background = 'color-mix(in srgb, var(--color-danger) 8%, transparent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--color-text-tertiary)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <Icon name="trash" size={16} />
          删除单词
        </button>
      </div>
    </div>
  )
}
