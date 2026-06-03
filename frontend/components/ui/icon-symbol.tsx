// Alternativă pentru MaterialIcons pe Android și web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<
  SymbolViewProps['name'],
  ComponentProps<typeof MaterialIcons>['name']
>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Mapare SF Symbols -> Material Icons.
 * - vezi Material Icons în [Icons Directory](https://icons.expo.fyi).
 * - vezi SF Symbols în aplicația [SF Symbols](https://developer.apple.com/sf-symbols/).
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // Tab-uri și simboluri comune în aplicație
  'list.bullet': 'format-list-bulleted',
  'plus.circle.fill': 'add',
  'person.fill': 'person',
} as IconMapping;

/**
 * Componentă de icoane care folosește SF Symbols nativ pe iOS și Material Icons pe Android/web.
 * Asigură consistență vizuală și utilizare optimă a resurselor.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // Defensiv: dacă lipsește maparea, folosim o icoană generică
  const mappedName =
    (MAPPING as Record<string, string>)[name] || 'help-outline';
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={mappedName as any}
      style={style}
    />
  );
}
