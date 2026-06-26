import ts from 'typescript';

export const getLineRange = (
	sourceFile: ts.SourceFile,
	startPos: number,
	endPos: number,
): { startLine: number; endLine: number; text: string } => {
	const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(startPos);
	const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(endPos);
	const lineStarts = sourceFile.getLineStarts();
	const lineStart = lineStarts[startLine];
	const lineEnd = endLine + 1 < lineStarts.length ? lineStarts[endLine + 1] : sourceFile.text.length;
	return { startLine, endLine, text: sourceFile.text.slice(lineStart, lineEnd) };
};
