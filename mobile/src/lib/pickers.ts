import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

/** Opens the system date dialog. Android only; iOS needs the inline `DateTimePicker` component instead. */
export function pickDate(current: Date, onPick: (date: Date) => void) {
  if (process.env.EXPO_OS !== 'android') return;
  DateTimePickerAndroid.open({
    value: current,
    mode: 'date',
    onValueChange: (_event, date) => onPick(date),
  });
}

/** Opens the system time dialog. Android only, like `pickDate`. */
export function pickTime(current: Date, onPick: (date: Date) => void) {
  if (process.env.EXPO_OS !== 'android') return;
  DateTimePickerAndroid.open({
    value: current,
    mode: 'time',
    onValueChange: (_event, date) => onPick(date),
  });
}
