import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle } from 'react-native';
import { sharedStyles, colors } from '../../theme';

export interface TypographyProps extends TextProps {
  variant?:
    | 'displayLarge'
    | 'displayMedium'
    | 'heading'
    | 'subheading'
    | 'bodyLarge'
    | 'body'
    | 'bodySmall'
    | 'caption';
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

export function Typography({
  variant = 'body',
  color,
  align,
  weight,
  style,
  children,
  ...props
}: TypographyProps) {
  const textStyle = [
    sharedStyles[variant],
    color && { color },
    align && { textAlign: align },
    weight && { fontWeight: weight },
    style,
  ];

  return (
    <Text style={textStyle} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({});
