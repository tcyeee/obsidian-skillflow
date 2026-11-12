export function classNames(...classes: (string | false | undefined)[]): string {
	return classes.filter(Boolean).join(" ");
}
