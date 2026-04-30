/**
 * DashboardSettingsSection — export, import, reset, and icon management.
 *
 * Consolidates actions that were previously scattered across the FAB menu.
 */
import { useTranslation } from 'react-i18next'
import { Download, RotateCcw, Heart, Palette, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { DashboardHealthIndicator } from '../../DashboardHealthIndicator'
import { iconRegistry } from '../../../../lib/icons'

function IconPreview({ iconName }: { iconName: string }) {
  const IconComponent = iconRegistry[iconName]
  return IconComponent ? <IconComponent size={16} /> : <span>?</span>
}

interface DashboardSettingsSectionProps {
  onExport?: () => void
  onReset?: () => void
  isCustomized?: boolean
  currentIcon?: string
  onIconChange?: (iconName: string) => void
}

export function DashboardSettingsSection({
  onExport,
  onReset,
  isCustomized = false,
  currentIcon,
  onIconChange,
}: DashboardSettingsSectionProps) {
  const { t } = useTranslation()
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Popular icons for quick access (expanded list)
  const popularIcons = [
    'Sparkles',
    'Zap',
    'Rocket',
    'Target',
    'Compass',
    'Gauge',
    'Qiskit',
    'Database',
    'Server',
    'Cloud',
    'Grid',
    'Layers',
    'Brain',
    'Bot',
    'Code',
    'GitBranch',
    'Globe',
    'Heart',
    'Info',
    'Lock',
    'Map',
    'Microscope',
    'Network',
    'Package',
    'Settings',
    'Shield',
    'Slack',
    'Terminal',
    'Truck',
    'Wifi',
    'Star',
    'Clock',
  ]

  // Get all available icons for search
  const allIcons = useMemo(() => Object.keys(iconRegistry), [])

  // Filter icons based on search query
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return popularIcons.filter((icon) => iconRegistry[icon])
    }
    const query = searchQuery.toLowerCase()
    return allIcons.filter((icon) => icon.toLowerCase().includes(query))
  }, [searchQuery, allIcons])

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Icon Settings */}
      {onIconChange && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" />
            {t('dashboard.icon', 'Dashboard Icon')}
          </h3>
          <button
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="w-full px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors text-sm flex items-center gap-2"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              {currentIcon ? (
                <IconPreview iconName={currentIcon} />
              ) : (
                <Palette size={16} />
              )}
            </div>
            {currentIcon || 'Choose icon...'}
          </button>

          {showIconPicker && (
            <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border space-y-3">
              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search icons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Icon grid */}
              <div className="max-h-64 overflow-y-auto">
                {filteredIcons.length > 0 ? (
                  <div className="grid grid-cols-6 gap-2">
                    {filteredIcons.map((iconName) => {
                      const IconComponent = iconRegistry[iconName]
                      return (
                        <button
                          key={iconName}
                          onClick={() => {
                            onIconChange(iconName)
                            setShowIconPicker(false)
                            setSearchQuery('')
                          }}
                          className={`p-2 rounded-lg transition-colors flex items-center justify-center ${
                            currentIcon === iconName
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                          }`}
                          title={iconName}
                        >
                          {IconComponent && <IconComponent size={16} />}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No icons found
                  </div>
                )}
              </div>

              {/* Results info */}
              {searchQuery && (
                <div className="text-xs text-muted-foreground text-center">
                  {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''} found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Health */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
          <Heart className="w-4 h-4 text-muted-foreground" />
          {t('dashboard.studio.sections.health', 'Dashboard Health')}
        </h3>
        <div className="rounded-lg border border-border p-3 bg-secondary/20">
          <DashboardHealthIndicator />
        </div>
      </div>

      {/* Export */}
      {onExport && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Download className="w-4 h-4 text-muted-foreground" />
            {t('dashboard.studio.sections.export', 'Export & Import')}
          </h3>
          <button
            onClick={onExport}
            className="px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors text-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {t('dashboard.export', 'Export dashboard as JSON')}
          </button>
        </div>
      )}

      {/* Reset */}
      {onReset && isCustomized && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
            {t('dashboard.studio.sections.reset', 'Reset Options')}
          </h3>
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            {t('dashboard.resetToDefaults', 'Reset to defaults')}
          </button>
          <p className="text-xs text-muted-foreground mt-2">
            {t('dashboard.resetDescription', 'This will restore the default card layout for this dashboard.')}
          </p>
        </div>
      )}
    </div>
  )
}
