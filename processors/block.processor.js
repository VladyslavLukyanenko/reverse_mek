"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simplifySequenceExpr = exports.splitReturnSeqStatementToExprsArray = exports.processBlockStatements = void 0;
let globalArgsCounter = 0;
let globalVarCounter = 0;
function processBlockStatements() {
    return {
        BlockStatement(node) {
            if (node.type !== "BlockStatement") {
                return;
            }
            // processing if statements.
            for (let i = 0; i < node.body.length; i++) {
                const curr = node.body[i];
                const toAppend = [];
                switch (curr?.type) {
                    case "IfStatement":
                        if (curr.consequent.type !== "BlockStatement") {
                            curr.consequent = {
                                type: "BlockStatement",
                                body: [
                                    curr.consequent
                                ]
                            };
                        }
                        if (curr.alternate && curr.alternate.type !== "BlockStatement") {
                            curr.alternate = {
                                type: "BlockStatement",
                                body: [
                                    curr.alternate
                                ]
                            };
                        }
                        if (curr.test.type === "LogicalExpression") {
                            let logical = curr.test;
                            // if (logical.operator === "&&") {
                            //   curr.test = logical.right;
                            //   const ifStmt = convertLogicalExpressionToIfStatement(logical);
                            //   ifStmt.consequent = curr;
                            //   ifStmt.alternate = curr.alternate;
                            //   curr.alternate = null;
                            //   node.body[i] = ifStmt;
                            //   i--;
                            // }
                            // if (logical.left.type === "UnaryExpression") {
                            //
                            // }
                            processLogicalExpr(logical, toAppend);
                        }
                        else {
                            processIfStatementInBlock(curr, toAppend);
                        }
                        break;
                    case "SwitchStatement":
                        if (curr.discriminant.type === "SequenceExpression") {
                            curr.discriminant = simplifySequenceExpr(curr.discriminant, toAppend);
                        }
                        break;
                    case "ExpressionStatement":
                        if (!curr.expression) {
                            break;
                        }
                        switch (curr.expression.type) {
                            case "AssignmentExpression":
                                if (curr.expression.right.type === "ConditionalExpression" && curr.expression.left.type === "Identifier") {
                                    const cond = curr.expression.right;
                                    const id = curr.expression.left;
                                    const ifExpr = {
                                        type: "IfStatement",
                                        test: cond.test,
                                        consequent: {
                                            type: "BlockStatement",
                                            body: [
                                                {
                                                    type: "ExpressionStatement",
                                                    expression: {
                                                        type: "AssignmentExpression",
                                                        left: id,
                                                        right: cond.consequent,
                                                        operator: curr.expression.operator
                                                    }
                                                }
                                            ]
                                        },
                                        alternate: {
                                            type: "BlockStatement",
                                            body: [
                                                {
                                                    type: "ExpressionStatement",
                                                    expression: {
                                                        type: "AssignmentExpression",
                                                        left: curr.expression.left,
                                                        right: cond.alternate,
                                                        operator: curr.expression.operator
                                                    }
                                                }
                                            ]
                                        }
                                    };
                                    node.body[i] = ifExpr;
                                    i--;
                                }
                                else if (curr.expression.right.type === "LogicalExpression") {
                                    // const logical: ESTree.LogicalExpression = curr.expression.right;
                                    // const id: ESTree.Identifier = {
                                    //   type: "Identifier",
                                    //   name: "var_" + globalVarCounter++
                                    // };
                                    // curr.expression.right = id;
                                    //
                                    // const variable: ESTree.VariableDeclaration = {
                                    //   type: "VariableDeclaration",
                                    //   kind: "var",
                                    //   declarations: [
                                    //     {
                                    //       type: "VariableDeclarator",
                                    //       init: logical,
                                    //       id
                                    //     }
                                    //   ]
                                    // }
                                    //
                                    // node.body.splice(i, 0, variable);
                                    // i--;
                                }
                                else {
                                    processAssignmentExpressionInExpressionStmt(curr.expression, toAppend);
                                }
                                break;
                            case "CallExpression":
                                processCallExpr(curr.expression, toAppend);
                                break;
                            case "NewExpression":
                                processNewExpr(curr.expression, toAppend);
                                break;
                            case "LogicalExpression":
                                node.body[i] = convertLogicalExpressionToIfStatement(curr.expression);
                                i--;
                                break;
                            case "SequenceExpression":
                                curr.expression = simplifySequenceExpr(curr.expression, toAppend);
                                break;
                            case "ConditionalExpression":
                                const ifStmt = {
                                    ...curr.expression,
                                    type: "IfStatement",
                                    consequent: {
                                        type: "ExpressionStatement",
                                        expression: curr.expression.consequent
                                    },
                                    alternate: !curr.expression.alternate ? null : {
                                        type: "ExpressionStatement",
                                        expression: curr.expression.alternate
                                    }
                                };
                                node.body[i] = ifStmt;
                                i--;
                                break;
                        }
                        break;
                    case "ReturnStatement":
                        if (curr.argument && curr.argument.type === "SequenceExpression") {
                            curr.argument = simplifySequenceExpr(curr.argument, toAppend);
                        }
                        /*if (!curr.argument || curr.argument.type === "Identifier" || curr.argument.type.endsWith("Literal") || curr.argument.type === "MemberExpression" && !curr.argument.computed) {
                          return;
                        }
            
                        const variable: ESTree.Identifier = {
                          type: "Identifier",
                          name: "var_" + globalVarCounter++
                        };
            
                        const varDecl: ESTree.VariableDeclaration = {
                          type: "VariableDeclaration",
                          kind: "var",
                          declarations: [
                            {
                              type: "VariableDeclarator",
                              init: curr.argument,
                              id: variable
                            }
                          ]
                        };
            
                        node.body.splice(i, 0, varDecl);
                        i--;
                        curr.argument = variable;*/
                        break;
                    case "VariableDeclaration":
                        for (const d of curr.declarations) {
                            if (!d.init) {
                                continue;
                            }
                            switch (d.init.type) {
                                case "SequenceExpression":
                                    d.init = simplifySequenceExpr(d.init, toAppend);
                                    break;
                                case "LogicalExpression":
                                    processLogicalExpr(d.init, toAppend);
                                    break;
                                case "CallExpression":
                                    processCallExpr(d.init, toAppend);
                                    break;
                                case "ArrayExpression":
                                    processArrayExpr(d.init, toAppend);
                                    // for (let eidx = 0; eidx < d.init.elements.length; eidx++) {
                                    //   const el = d.init.elements[eidx];
                                    //   if (el.type === "SequenceExpression") {
                                    //     d.init.elements[eidx] = simplifySequenceExpr(el, toAppend);
                                    //   }
                                    // }
                                    break;
                                case "NewExpression":
                                    processNewExpr(d.init, toAppend);
                                    break;
                                case "ObjectExpression":
                                    processObjectExpr(d.init, toAppend);
                                    break;
                                case "ConditionalExpression":
                                    if (d.id.type === "Identifier") {
                                        const cond = d.init;
                                        d.init = {
                                            type: "NullLiteral",
                                            value: null,
                                            raw: "null"
                                        };
                                        const id = d.id;
                                        const ifExpr = {
                                            type: "IfStatement",
                                            test: cond.test,
                                            consequent: {
                                                type: "BlockStatement",
                                                body: [
                                                    {
                                                        type: "ExpressionStatement",
                                                        expression: {
                                                            type: "AssignmentExpression",
                                                            left: id,
                                                            right: cond.consequent,
                                                            operator: "="
                                                        }
                                                    }
                                                ]
                                            },
                                            alternate: {
                                                type: "BlockStatement",
                                                body: [
                                                    {
                                                        type: "ExpressionStatement",
                                                        expression: {
                                                            type: "AssignmentExpression",
                                                            left: id,
                                                            right: cond.alternate,
                                                            operator: "="
                                                        }
                                                    }
                                                ]
                                            }
                                        };
                                        node.body.splice(i + 1, 0, ifExpr);
                                        i--;
                                    }
                                    break;
                                case "AssignmentExpression":
                                    processAssignmentExpressionInExpressionStmt(d.init, toAppend);
                                    break;
                                case "BinaryExpression":
                                    processBinaryExpression(d.init, toAppend);
                                    break;
                                case "UnaryExpression":
                                    processUnaryExpr(d.init, toAppend);
                                    break;
                            }
                        }
                        break;
                    case "ForStatement":
                        if (curr.body.type !== "BlockStatement") {
                            curr.body = {
                                type: "BlockStatement",
                                body: [
                                    curr.body
                                ]
                            };
                        }
                        if (curr.init) {
                            toAppend.push({
                                type: "ExpressionStatement",
                                expression: curr.init
                            });
                            curr.init = null;
                        }
                        //
                        // if (curr.init?.type === "AssignmentExpression") {
                        //   processAssignmentExpressionInExpressionStmt(curr.init, toAppend)
                        // } else if (curr.init?.type === "SequenceExpression") {
                        //   curr.init = simplifySequenceExpr(curr.init, toAppend);
                        // }
                        break;
                }
                if (toAppend.length) {
                    node.body.splice(i, 0, ...toAppend);
                    i--;
                }
            }
        },
    };
}
exports.processBlockStatements = processBlockStatements;
function processUnaryExpr(expr, toAppend) {
    switch (expr.argument.type) {
        case "SequenceExpression":
            expr.argument = simplifySequenceExpr(expr.argument, toAppend);
            break;
        case "BinaryExpression":
            processBinaryExpression(expr.argument, toAppend);
            break;
        case "LogicalExpression":
            processLogicalExpr(expr.argument, toAppend);
            break;
        case "MemberExpression":
            processMemberExpr(expr.argument, toAppend);
            break;
        case "CallExpression":
            processCallExpr(expr.argument, toAppend);
            break;
        case "AssignmentExpression":
            var varName = {
                type: "Identifier",
                name: "var_" + globalVarCounter++
            };
            var variable = {
                type: "VariableDeclaration",
                kind: "var",
                declarations: [
                    {
                        type: "VariableDeclarator",
                        init: expr.argument,
                        id: varName
                    }
                ]
            };
            toAppend.push(variable);
            expr.argument = varName;
            break;
    }
}
function processInlineExpression(expr, toAppend, replaceHandler) {
    switch (expr.type) {
        case "CallExpression":
            processCallExpr(expr, toAppend);
            break;
        case "SequenceExpression":
            replaceHandler(simplifySequenceExpr(expr, toAppend));
            break;
        case "UnaryExpression":
            processUnaryExpr(expr, toAppend);
            break;
        case "BinaryExpression":
            processBinaryExpression(expr, toAppend);
            break;
        case "MemberExpression":
            processMemberExpr(expr, toAppend);
            break;
        case "AssignmentExpression":
            processAssignmentExpressionInExpressionStmt(expr, toAppend);
            break;
        case "LogicalExpression":
            processLogicalExpr(expr, toAppend);
            break;
        case "NewExpression":
            processNewExpr(expr, toAppend);
            break;
    }
}
function processLogicalExpr(logical, toAppend) {
    if (logical.operator === "&&") {
        const left = logical.left;
        processInlineExpression(left, toAppend, r => logical.left = r);
        // processInlineExpression(logical.right, toAppend, r => logical.right = r)
        //
        // if (logical.right.type === "SequenceExpression") {
        //   logical.right = simplifySequenceExpr(logical.right, toAppend);
        // }
        //
        //
        // const left = logical.left;
        // processInlineExpression(left, toAppend, r => logical.left = r);
    }
    else if (logical.operator === "||") {
        processInlineExpression(logical.left, toAppend, r => logical.left = r);
        // if (logical.left.type === "SequenceExpression") {
        //   logical.left = simplifySequenceExpr(logical.left, toAppend);
        // } else if (logical.left.type === "AssignmentExpression") {
        //   processAssignmentExpressionInExpressionStmt(logical.left, toAppend);
        // } else if (logical.left.type === "BinaryExpression") {
        //   processBinaryExpression(logical.left, toAppend);
        // }
    }
}
function processObjectExpr(expr, toAppend) {
    for (const prop of expr.properties) {
        if (prop.type === "Property") {
            if (prop.value.type === "SequenceExpression") {
                prop.value = simplifySequenceExpr(prop.value, toAppend);
            }
        }
        else {
            // debugger;
            // throw new Error("Only Property supported for processing of ObjectExpression");
        }
    }
}
function splitReturnSeqStatementToExprsArray(ret) {
    const seq = ret.argument;
    const leadingExpressions = seq.expressions.slice(0, -1).map(e => ({
        type: "ExpressionStatement",
        expression: e
    }));
    const lastExpr = distillateReturnExpressions(seq.expressions[seq.expressions.length - 1]);
    leadingExpressions.push(lastExpr);
    return leadingExpressions;
    function distillateReturnExpressions(inExpr) {
        if (inExpr.type === "SequenceExpression") {
            leadingExpressions.push(...inExpr.expressions.slice(0, -1).map(e => ({
                type: "ExpressionStatement",
                expression: e
            })));
            return distillateReturnExpressions(inExpr[inExpr.expressions.length - 1]);
        }
        return {
            type: "ReturnStatement",
            argument: inExpr
        };
    }
}
exports.splitReturnSeqStatementToExprsArray = splitReturnSeqStatementToExprsArray;
function simplifySequenceExpr(seq, toAppend) {
    for (const expr of seq.expressions.slice(0, -1)) {
        if (expr.type === "LogicalExpression") {
            const ifExpr = convertLogicalExpressionToIfStatement(expr);
            toAppend.push(ifExpr);
        }
        else {
            toAppend.push({
                type: "ExpressionStatement",
                expression: expr
            });
        }
    }
    return seq.expressions.slice(-1)[0];
}
exports.simplifySequenceExpr = simplifySequenceExpr;
function processMemberExpr(callee, toAppend) {
    if (callee.property.type === "SequenceExpression") {
        callee.property = simplifySequenceExpr(callee.property, toAppend);
    }
    if (callee.object.type === "MemberExpression") {
        // callee = callee.object;
        processMemberExpr(callee.object, toAppend);
        // continue;
    }
    if (callee.property.type === "MemberExpression") {
        // callee = callee.object;
        processMemberExpr(callee.property, toAppend);
        // continue;
    }
    if (callee.object.type === "CallExpression") {
        processCallExpr(callee.object, toAppend);
    }
    if (callee.object.type === "SequenceExpression") {
        callee.object = simplifySequenceExpr(callee.object, toAppend);
    }
}
function canArgumentBeConvertedToBlockScopeVar(arg) {
    // TODO: maybe check if LogicalExpression||ArrayExpression||ConditionalExpression||BinaryExpression are simple and skip them?
    return arg.type === "CallExpression"
        || arg.type === "LogicalExpression"
        || arg.type === "NewExpression"
        || arg.type === "FunctionExpression"
        || arg.type === "ArrayExpression"
        || arg.type === "ConditionalExpression"
        || arg.type === "ObjectExpression"
        || arg.type === "BinaryExpression";
}
function processCallExpr(call, toAppend) {
    let callee = call.callee;
    if (callee.type === "MemberExpression") {
        processMemberExpr(callee, toAppend);
    }
    else if (callee.type === "SequenceExpression") {
        call.callee = simplifySequenceExpr(callee, toAppend);
    }
    for (let idx = 0; idx < call.arguments.length; idx++) {
        const arg = call.arguments[idx];
        // const id = convertArgToStatementIfNotSimple(arg, toAppend);
        // if (id) {
        //   call.arguments[idx] = id;
        // }
        if (arg.type === "SequenceExpression") {
            call.arguments[idx] = simplifySequenceExpr(arg, toAppend);
        }
        else if (arg.type === "MemberExpression") {
            processMemberExpr(arg, toAppend);
        }
        else if (canArgumentBeConvertedToBlockScopeVar(arg)) {
            const id = convertArgToStatementIfNotSimple(arg, toAppend);
            if (id) {
                call.arguments[idx] = id;
            }
        }
    }
}
function processIfStatementInBlock(curr, toAppend) {
    const test = curr.test;
    processInlineExpression(test, toAppend, r => curr.test = r);
}
function processBinaryExpression(node, toAppend) {
    deepProcessSequenceInBinaryExpression(node, toAppend);
    const handlers = {
        "CallExpression": processCallExpr,
        "MemberExpression": processMemberExpr,
        "BinaryExpression": processBinaryExpression,
    };
    for (const side of [node.left, node.right]) {
        const handler = handlers[side.type];
        if (handler) {
            handler(side, toAppend);
        }
    }
    function deepProcessSequenceInBinaryExpression(expr, toAppend) {
        const sides = ["right", "left"];
        for (const side of sides) {
            if (expr[side].type === "BinaryExpression") {
                const bin = expr[side];
                processSequences(bin);
            }
        }
        processSequences(expr);
        function processSequences(node) {
            for (const childSide of sides) {
                if (node[childSide].type === "SequenceExpression") {
                    node[childSide] = simplifySequenceExpr(node[childSide], toAppend);
                }
            }
        }
    }
    /*
      function processDeepestBinaryExpression(bin: ESTree.BinaryExpression, toAppend: ESTree.Node[]): void {
        const bins = [bin.left, bin.right].filter(e => e.type === "BinaryExpression") as ESTree.BinaryExpression[];
        for (const b of bins) {
          if (b.right.type === "BinaryExpression") {
            processDeepestBinaryExpression(b.right, toAppend);
          }
          if (b.left.type === "BinaryExpression") {
            processDeepestBinaryExpression(b.left, toAppend);
          }
  
        }
  
        deepProcessSequenceInBinaryExpression(bin, toAppend);
      }
  
      function processDeepestMemberExpression(bin: ESTree.BinaryExpression, toAppend: ESTree.Statement[]): void {
        const bins = [bin.left, bin.right].filter(e => e.type === "BinaryExpression") as ESTree.BinaryExpression[];
        for (const b of bins) {
          processBinaryExpression(b, toAppend);
        }
  
        processChildMemberExpr(bin);
  
        function processChildMemberExpr(expr: ESTree.BinaryExpression) {
          if (expr.right.type === "MemberExpression") {
            processMemberExpr(expr.right, toAppend);
          }
          if (expr.left.type === "MemberExpression") {
            processMemberExpr(expr.left, toAppend);
          }
        }
      }*/
}
function convertLogicalExpressionToIfStatement(expr) {
    let test;
    if (expr.operator === "&&") {
        test = expr.left;
    }
    else if (expr.operator === "||") {
        test = {
            type: "UnaryExpression",
            operator: "!",
            prefix: true,
            argument: expr.left
        };
    }
    else {
        throw new Error(`Operator "${expr.operator}" not supported in conversion from LogicalExpression to IfStatement yet.`);
    }
    return {
        type: "IfStatement",
        test: test,
        consequent: {
            type: "BlockStatement",
            body: [
                {
                    type: "ExpressionStatement",
                    expression: expr.right
                }
            ]
        }
    };
}
function convertArgToStatementIfNotSimple(arg, toAppend) {
    if (arg.type.endsWith("Literal") || arg.type === "Identifier") {
        return undefined;
    }
    const id = {
        type: "Identifier",
        name: "arg_" + globalArgsCounter++
    };
    const varDecl = {
        type: "VariableDeclaration",
        declarations: [
            {
                type: "VariableDeclarator",
                init: arg,
                id
            }
        ],
        kind: "var"
    };
    toAppend.push(varDecl);
    return id;
}
function processNewExpr(newExpr, toAppend) {
    for (let aIdx = 0; aIdx < newExpr.arguments.length; aIdx++) {
        const arg = newExpr.arguments[aIdx];
        const id = convertArgToStatementIfNotSimple(arg, toAppend);
        if (id) {
            newExpr.arguments[aIdx] = id;
        }
        //
        // if (arg.type === "SequenceExpression") {
        //   newExpr.arguments[aIdx] = simplifySequenceExpr(arg, toAppend);
        // }
    }
    if (newExpr.callee.type === "SequenceExpression") {
        newExpr.callee = simplifySequenceExpr(newExpr.callee, toAppend);
    }
}
function processArrayExpr(arrayExpr, toAppend) {
    for (let i = 0; i < arrayExpr.elements.length; i++) {
        let e = arrayExpr.elements[i];
        if (e.type === "SequenceExpression") {
            arrayExpr.elements[i] = simplifySequenceExpr(e, toAppend);
        }
        else if (e.type === "CallExpression") {
            processCallExpr(e, toAppend);
        }
        else if (e.type === "MemberExpression") {
            processMemberExpr(e, toAppend);
        }
    }
}
function processCondExpr(cond, toAppend) {
    if (cond.test.type === "CallExpression") {
        processCallExpr(cond.test, toAppend);
        // if (cond.test.callee.type === "MemberExpression") {
        //   const seq = cond.test.callee.object;
        //   if (seq.type === "SequenceExpression") {
        //     cond.test.callee.object = seq.expressions.slice(-1)[0];
        //     toAppend.push(...toExpressionStatements(seq, 0, -1));
        //   }
        // }
    }
    else if (cond.test.type === "BinaryExpression") {
        processBinaryExpression(cond.test, toAppend);
    }
    else if (cond.test.type === "SequenceExpression") {
        cond.test = simplifySequenceExpr(cond.test, toAppend);
    } /* else if (cond.test.type === "LogicalExpression") {
      processLogicalExpr(cond.test, toAppend);
    }*/
    if (cond.consequent.type === "SequenceExpression") {
        cond.consequent = simplifySequenceExpr(cond.consequent, toAppend);
    }
}
function processAssignmentExpressionInExpressionStmt(assignment, toAppend) {
    function processRightMember() {
        if (assignment.right.type === "ConditionalExpression") {
            const cond = assignment.right;
            processCondExpr(cond, toAppend);
        }
        if (assignment.right.type === "NewExpression") {
            const newExpr = assignment.right;
            processNewExpr(newExpr, toAppend);
        }
        if (assignment.right.type === "CallExpression") {
            processCallExpr(assignment.right, toAppend);
            // const callee = assignment.right.callee;
            // processCallExpr(assignment.right, toAppend);
            // if (callee.type === "MemberExpression" && callee.property.type === "SequenceExpression") {
            //   toAppend.push(...toExpressionStatements(callee.property, 0, -1))
            //   callee.property = callee.property.expressions.slice(-1)[0];
            // }
        }
        if (assignment.right.type === "MemberExpression") {
            processMemberExpr(assignment.right, toAppend);
        }
        if (assignment.right.type === "SequenceExpression") {
            assignment.right = simplifySequenceExpr(assignment.right, toAppend);
        }
        if (assignment.right.type === "ArrayExpression") {
            const arrayExpr = assignment.right;
            processArrayExpr(arrayExpr, toAppend);
        }
        if (assignment.right.type === "BinaryExpression") {
            processBinaryExpression(assignment.right, toAppend);
        }
        if (assignment.right.type === "UnaryExpression") {
            processUnaryExpr(assignment.right, toAppend);
        }
        if (assignment.right.type === "ObjectExpression") {
            processObjectExpr(assignment.right, toAppend);
        }
    }
    if (assignment.right.type === "AssignmentExpression") {
        processAssignmentExpressionInExpressionStmt(assignment.right, toAppend);
    }
    if (assignment.left.type === "MemberExpression") {
        processMemberExpr(assignment.left, toAppend);
    }
    processRightMember();
}
//# sourceMappingURL=block.processor.js.map