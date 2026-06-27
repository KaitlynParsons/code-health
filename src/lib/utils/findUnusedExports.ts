import * as vscode from 'vscode';
import ts from 'typescript';

import type { Smell } from '../../types';
import { getLineRange } from './getLineRange';

const resolveAlias = (checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol => {
	if (symbol.flags & ts.SymbolFlags.Alias) {
		return checker.getAliasedSymbol(symbol);
	}
	return symbol;
};

export const findUnusedExports = (program: ts.Program, sourceFiles: ts.SourceFile[]): Smell[] => {
	const results: Smell[] = [];
	const checker = program.getTypeChecker();
	// Collect all symbols that are actually imported somewhere
	const importedSymbols = new Set<ts.Symbol>();

	for (const sourceFile of sourceFiles) {
		for (const stmt of sourceFile.statements) {
			if (!ts.isImportDeclaration(stmt) || !stmt.importClause) { 
				continue; 
			}
			const { name, namedBindings } = stmt.importClause;
			if (name) {
				const sym = checker.getSymbolAtLocation(name);
				if (sym) { 
					importedSymbols.add(resolveAlias(checker, sym)); 
				}
			}
			if (namedBindings && ts.isNamedImports(namedBindings)) {
				for (const element of namedBindings.elements) {
					const sym = checker.getSymbolAtLocation(element.name);
					if (sym) { 
						importedSymbols.add(resolveAlias(checker, sym)); 
					}
				}
			}
		}
	}

	// Find exports not present in importedSymbols
	for (const sourceFile of sourceFiles) {
		const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
		if (!moduleSymbol) { 
			continue; 
		}
		for (const exportSymbol of checker.getExportsOfModule(moduleSymbol)) {
			if (exportSymbol.name === 'default') { 
				continue; 
			}
			const resolved = resolveAlias(checker, exportSymbol);
			if (importedSymbols.has(resolved) || importedSymbols.has(exportSymbol)) { 
				continue; 
			}
			const decl = (resolved.getDeclarations() ?? exportSymbol.getDeclarations() ?? [])[0];
			if (!decl) { 
				continue; 
			}
			const declFile = decl.getSourceFile();
			const { startLine, endLine, text } = getLineRange(declFile, decl.getStart(), decl.getEnd());
			results.push({
				file: vscode.workspace.asRelativePath(declFile.fileName),
				startLine: startLine + 1,
				endLine: endLine + 1,
				message: `'${exportSymbol.name}' is exported but never imported.`,
				size: Buffer.byteLength(text, 'utf8'),
				type: "dead"
			});
		}
	}

	return results;
};
