import { ReactNode } from 'react'
import { LucideIcon, CheckCircle, AlertTriangle, Info, Search, Filter, ChevronDown, ChevronRight, Server } from 'lucide-react'
import { Skeleton } from '../../components/ui/Skeleton'

// ============================================================================
// CardSkeleton - Loading state for cards
// ============================================================================

export interface CardSkeletonProps {
  /** Number of skeleton rows to show */
  rows?: number
  /** Type of skeleton layout */
  type?: 'table' | 'list' | 'chart' | 'status'
  /** Show header skeleton */
  showHeader?: boolean
  /** Show search skeleton */
  showSearch?: boolean
}

export function CardSkeleton({
  rows = 3,
  type = 'list',
  showHeader = true,
  showSearch = false,
}: CardSkeletonProps) {
  return (
    <div className="h-full flex flex-col min-h-card">
      {showHeader && (
        <div className="flex items-center justify-between mb-3">
          <Skeleton variant="text" width={80} height={16} />
          <Skeleton variant="rounded" width={80} height={28} />
        </div>
      )}
      {showSearch && (
        <Skeleton variant="rounded" height={32} className="mb-3" />
      )}
      <div className="space-y-2">
        {type === 'chart' ? (
          <Skeleton variant="rounded" height={200} />
        ) : (
          Array.from({ length: rows }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={type === 'table' ? 48 : 80}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ============================================================================
// CardEmptyState - Empty state with icon and message
// ============================================================================

export interface CardEmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon
  /** Main title */
  title: string
  /** Secondary message */
  message?: string
  /** Variant determines color scheme */
  variant?: 'success' | 'info' | 'warning' | 'neutral'
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
  }
}

const emptyStateVariants = {
  success: {
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    icon: CheckCircle,
  },
  info: {
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    icon: Info,
  },
  warning: {
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
    icon: AlertTriangle,
  },
  neutral: {
    iconBg: 'bg-secondary',
    iconColor: 'text-muted-foreground',
    icon: Info,
  },
}

export function CardEmptyState({
  icon,
  title,
  message,
  variant = 'neutral',
  action,
}: CardEmptyStateProps) {
  const variantConfig = emptyStateVariants[variant]
  const Icon = icon || variantConfig.icon

  return (
    <div className="h-full flex flex-col content-loaded">
      <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
        <div
          className={`w-12 h-12 rounded-full ${variantConfig.iconBg} flex items-center justify-center mb-3`}
          title={title}
        >
          <Icon className={`w-6 h-6 ${variantConfig.iconColor}`} />
        </div>
        <p className="text-foreground font-medium">{title}</p>
        {message && (
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        )}
        {action && (
          <button
            onClick={action.onClick}
            className="mt-3 px-3 py-1.5 text-sm rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// CardErrorState - Error state with retry option
// ============================================================================

export interface CardErrorStateProps {
  /** Error message */
  error: string
  /** Retry callback */
  onRetry?: () => void
  /** Whether retry is in progress */
  isRetrying?: boolean
}

export function CardErrorState({ error, onRetry, isRetrying }: CardErrorStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-4">
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <p className="text-foreground font-medium">Error loading data</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-3 px-3 py-1.5 text-sm rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          {isRetrying ? 'Retrying...' : 'Try again'}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// CardSearchInput - Reusable search input
// ============================================================================

export interface CardSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CardSearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: CardSearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-1.5 text-xs bg-secondary rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/50"
      />
    </div>
  )
}

// ============================================================================
// CardClusterFilter - Reusable cluster filter dropdown
// ============================================================================

export interface CardClusterFilterProps {
  /** Available clusters to filter */
  availableClusters: { name: string }[]
  /** Currently selected clusters */
  selectedClusters: string[]
  /** Toggle cluster selection */
  onToggle: (cluster: string) => void
  /** Clear all selections */
  onClear: () => void
  /** Whether dropdown is visible */
  isOpen: boolean
  /** Set dropdown visibility */
  setIsOpen: (open: boolean) => void
  /** Ref for click outside handling */
  containerRef: React.RefObject<HTMLDivElement>
}

export function CardClusterFilter({
  availableClusters,
  selectedClusters,
  onToggle,
  onClear,
  isOpen,
  setIsOpen,
  containerRef,
}: CardClusterFilterProps) {
  if (availableClusters.length <= 1) return null

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg border transition-colors ${
          selectedClusters.length > 0
            ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
            : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
        }`}
        title="Filter by cluster"
      >
        <Filter className="w-3 h-3" />
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 max-h-48 overflow-y-auto rounded-lg bg-card border border-border shadow-lg z-50">
          <div className="p-1">
            <button
              onClick={onClear}
              className={`w-full px-2 py-1.5 text-xs text-left rounded transition-colors ${
                selectedClusters.length === 0
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'hover:bg-secondary text-foreground'
              }`}
            >
              All clusters
            </button>
            {availableClusters.map((cluster) => (
              <button
                key={cluster.name}
                onClick={() => onToggle(cluster.name)}
                className={`w-full px-2 py-1.5 text-xs text-left rounded transition-colors ${
                  selectedClusters.includes(cluster.name)
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'hover:bg-secondary text-foreground'
                }`}
              >
                {cluster.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CardClusterIndicator - Shows current cluster filter state
// ============================================================================

export interface CardClusterIndicatorProps {
  selectedCount: number
  totalCount: number
}

export function CardClusterIndicator({ selectedCount, totalCount }: CardClusterIndicatorProps) {
  if (selectedCount === 0) return null

  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
      <Server className="w-3 h-3" />
      {selectedCount}/{totalCount}
    </span>
  )
}

// ============================================================================
// CardListItem - Generic clickable list item
// ============================================================================

export interface CardListItemProps {
  onClick?: () => void
  /** Background color variant */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  /** Custom background class */
  bgClass?: string
  /** Custom border class */
  borderClass?: string
  /** Show chevron on hover */
  showChevron?: boolean
  /** Children content */
  children: ReactNode
  /** Tooltip */
  title?: string
  /** Data attribute for tour */
  dataTour?: string
}

const listItemVariants = {
  default: { bg: 'bg-secondary/30', border: 'border-border/50' },
  success: { bg: 'bg-green-500/20', border: 'border-green-500/20' },
  warning: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/20' },
  error: { bg: 'bg-red-500/20', border: 'border-red-500/20' },
  info: { bg: 'bg-blue-500/20', border: 'border-blue-500/20' },
}

export function CardListItem({
  onClick,
  variant = 'default',
  bgClass,
  borderClass,
  showChevron = true,
  children,
  title,
  dataTour,
}: CardListItemProps) {
  const variantConfig = listItemVariants[variant]
  const bg = bgClass || variantConfig.bg
  const border = borderClass || variantConfig.border

  return (
    <div
      data-tour={dataTour}
      className={`p-3 rounded-lg ${bg} border ${border} ${
        onClick ? 'cursor-pointer hover:opacity-80' : ''
      } transition-all group`}
      onClick={onClick}
      title={title}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">{children}</div>
        {showChevron && onClick && (
          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center" />
        )}
      </div>
    </div>
  )
}

// ============================================================================
// CardHeader - Standard card header with title and controls
// ============================================================================

export interface CardHeaderProps {
  /** Card title */
  title: string
  /** Count badge */
  count?: number
  /** Count badge color variant */
  countVariant?: 'default' | 'success' | 'warning' | 'error'
  /** Extra content after title */
  extra?: ReactNode
  /** Right-side controls */
  controls?: ReactNode
}

const countVariants = {
  default: 'bg-secondary text-muted-foreground',
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
}

export function CardHeader({
  title,
  count,
  countVariant = 'default',
  extra,
  controls,
}: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {count !== undefined && (
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${countVariants[countVariant]}`}
            title={`${count} items`}
          >
            {count}
          </span>
        )}
        {extra}
      </div>
      {controls && <div className="flex items-center gap-2">{controls}</div>}
    </div>
  )
}

// ============================================================================
// CardStatusBadge - Status indicator badge
// ============================================================================

export interface CardStatusBadgeProps {
  status: string
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  size?: 'sm' | 'md'
}

const statusBadgeVariants = {
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
  info: 'bg-blue-500/20 text-blue-400',
  neutral: 'bg-secondary text-muted-foreground',
}

export function CardStatusBadge({
  status,
  variant = 'neutral',
  size = 'sm',
}: CardStatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span
      className={`rounded ${statusBadgeVariants[variant]} ${sizeClasses}`}
      title={`Status: ${status}`}
    >
      {status}
    </span>
  )
}

// ============================================================================
// CardFilterChips - Status/category filter chips
// ============================================================================

export interface FilterChip {
  id: string
  label: string
  count?: number
  icon?: LucideIcon
  color?: string
}

export interface CardFilterChipsProps {
  chips: FilterChip[]
  activeChip: string
  onChipClick: (id: string) => void
}

export function CardFilterChips({ chips, activeChip, onChipClick }: CardFilterChipsProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
      {chips.map((chip) => {
        const isActive = activeChip === chip.id
        const Icon = chip.icon

        return (
          <button
            key={chip.id}
            onClick={() => onChipClick(chip.id)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors ${
              isActive
                ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                : 'bg-secondary/50 border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {Icon && <Icon className={`w-3 h-3 ${isActive && chip.color ? chip.color : ''}`} />}
            <span className="capitalize">{chip.label}</span>
            {chip.count !== undefined && (
              <span
                className={`px-1 rounded text-[10px] ${
                  isActive ? 'bg-purple-500/30' : 'bg-secondary'
                }`}
              >
                {chip.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
