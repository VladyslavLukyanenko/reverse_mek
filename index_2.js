const fs = require('fs');
const types = require('@babel/types');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const vm = require('vm');
let testing_opts = {
  comments: false,
  minified: true,
  concise: true,
}

let beautify_opts = {
  comments: true,
  minified: false,
  concise: false,
}
/*
const script = fs.readFileSync('VladHelp.js', 'utf-8');

const AST = parser.parse(script, {})



const decodingFunctionsContext = {};

vm.runInNewContext(generate(types.cloneNode(AST.program.body.shift()), testing_opts).code, decodingFunctionsContext); 
// Array taken out

const decodingFunctionName = AST.program.body[0].id.name;
vm.runInNewContext(generate(types.cloneNode(AST.program.body.shift()), testing_opts).code, decodingFunctionsContext);

vm.runInNewContext(`(${generate(types.cloneNode(AST.program.body[0].expression.expressions[0]), testing_opts).code})`, decodingFunctionsContext)

traverse(AST, {
  CallExpression(path){
    if(!(path.node.arguments.length === 2 &&
        types.isNumericLiteral(path.node.arguments[0]) &&
        types.isStringLiteral(path.node.arguments[1]))) return;

    let value = vm.runInNewContext(`${decodingFunctionName}(${path.node.arguments[0].value}, '${path.node.arguments[1].value}')`, decodingFunctionsContext);
    path.replaceWith(types.stringLiteral(value));
  }
})
const simpleOpWrapFunctions = {};
traverse(AST, {
  ExpressionStatement(path){
    // if (!types.isExpressionStatement(path)) return;
    const assign = path.node.expression;
    if (!types.isAssignmentExpression(assign) ||
      !types.isMemberExpression(assign.left) ||
      !types.isFunctionExpression(assign.right)) return;

    const member = assign.left;
    if (member.computed || types.isIdentifier(member.property))return;

    const fnNode = assign.right;
    if(fnNode.body.body.length !== 1 ||
        !types.isReturnStatement(fnNode.body.body[0])) return;

    simpleOpWrapFunctions[member.property.name] = types.cloneNode(fnNode);
    path.remove();
  }
  // ExpressionStatement

})

AST.program.body[0].expression.expressions.shift();

traverse(AST, {
  ObjectProperty(path) {
    if (!(types.isStringLiteral(path.node.key) &&
      types.isStringLiteral(path.node.value))) return;
    simpleOpWrapFunctions[path.node.key.value] = path.node.value.value;
    path.remove();
  },
  MemberExpression(path) {
    if (path.node.computed &&
      types.isIdentifier(path.node.object) &&
      types.isStringLiteral(path.node.property) &&
      simpleOpWrapFunctions[path.node.property.value] !== undefined &&
      typeof simpleOpWrapFunctions[path.node.property.value] === "string") {
        if(types.isAssignmentExpression(path.parentPath) &&
            path.key === 'left') return;
      let strValue = simpleOpWrapFunctions[path.node.property.value];
      let nodeToBeReplacedWith = types.stringLiteral(strValue);
      path.replaceWith(nodeToBeReplacedWith);
    }
  }
})

fs.writeFileSync('out_script.js', generate(AST, beautify_opts).code);
return;
*/

/*
const script = fs.readFileSync('out_script.js', 'utf-8');

const AST = parser.parse(script, {})

const controlFlowDeflatteningVisitor = {
  SwitchStatement(path) {
    // First, we check to make sure we are at a good SwitchStatement node
    if (types.isMemberExpression(path.node.discriminant) &&
      types.isIdentifier(path.node.discriminant.object) &&
      types.isUpdateExpression(path.node.discriminant.property) &&
      path.node.discriminant.property.operator === "++" &&
      path.node.discriminant.property.prefix === false) {

      let context = {};
      // After we've made sure we got to the right node, we'll
      // make a variable that will hold the cases in their order of execution
      // and gather them in it
      let nodesInsideCasesInOrder = [];
      // we gotta get to the parent of the parent
      // our SwitchStatement is wrapped inside a BlockStatement
      // which that BlockStatement is the child of a WhileStatement
      // which is in turn a child of another BlockStatement
      // so if we go 3 levels up, we can get the previous 2 nodes 
      // (the array containing indexes, and index counter)
      let mainBlockStatement = path.parentPath.parentPath.parentPath;
      // after we got 3 levels up, we gotta know the index of our
      // WhileStatement child in the body of the big BlockStatement
      let whileStatementKey = path.parentPath.parentPath.key;
      let init = mainBlockStatement.node.body[whileStatementKey - 2].declarations[mainBlockStatement.node.body[whileStatementKey - 2].declarations.length - 1].init;
      if (!(types.isMemberExpression(init.callee) &&
        types.isStringLiteral(init.callee.object))) return;
      vm.runInNewContext(`myArray = ${generate(mainBlockStatement.node.body[whileStatementKey - 2].declarations[mainBlockStatement.node.body[whileStatementKey - 2].declarations.length - 1].init).code}`, context);
      mainBlockStatement.get(`body.${whileStatementKey - 1}`);
      // after that, we can get the array with the cases in their execution order
      // both are in the save VariableDeclaration node so we substract 1
      // and get the first VariableDeclarator child
      // let arrayDeclaration = context.myArray;
      let casesOrderArray = context.myArray//eval(generate(arrayDeclaration.init).code);
      // next, we remember the order of the cases inside the switch
      // we'll use a map like this: caseValue -> caseIndex
      let casesInTheirOrderInSwitch = new Map();
      for (let i = 0; i < path.node.cases.length; i++) {
        casesInTheirOrderInSwitch.set(path.node.cases[i].test.value, i);
      }
      // After we've got the cases test values and the cases' keys, we're ready to go!
      for (let i = 0; i < casesOrderArray.length; i++) {
        let currentCase = path.node.cases[casesInTheirOrderInSwitch.get(casesOrderArray[i])];
        for (let j = 0; j < currentCase.consequent.length; j++) {
          // Don't forget to make sure you don't take a hold of
          // the continue statements
          if (!types.isContinueStatement(currentCase.consequent[j]))
            nodesInsideCasesInOrder.push(currentCase.consequent[j]);
        }
      }
      // after we got the nodes, we first delete delete the VariableDeclaration before our WhileStatement
      // mainBlockStatement.get('body')[whileStatementKey - 1].remove();
      // then we replace the WhileStatement (which has only our SwitchStatement)
      // with our nodes we've extracted
      mainBlockStatement.get('body')[whileStatementKey-1].remove()
      mainBlockStatement.get(`body`)[whileStatementKey-2].remove();
      path.parentPath.parentPath.replaceWithMultiple(nodesInsideCasesInOrder);
    }
  }
}
traverse(AST, controlFlowDeflatteningVisitor);

const eliminateUnusedFunctionsVisitor = {
  FunctionExpression(path) {
    // if()
  }
}

const allowedIdentifierCharsAndFirstChars = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$");
const allowedIdentifierChars = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$0123456789');
function isValidIdentifierName(name) {
  if (!allowedIdentifierCharsAndFirstChars.has(name[0])) return false;
  for (let i = 1; i < name.length; i++) {
    if (!allowedIdentifierChars.has(name[i])) return false;
  }
  return true;
}


const sqBracketToDotNotationVisitor = {
  MemberExpression(path) {
    if (!(path.node.computed === true &&
      types.isStringLiteral(path.node.property))) return;
    if (!isValidIdentifierName(path.node.property.value)) return;
    path.node.computed = false;
    path.get('property').replaceWith(types.identifier(path.node.property.value));
  }
}
traverse(AST, sqBracketToDotNotationVisitor);

const replaceUnaryExpressionsVisitor = {
  UnaryExpression(path) {
    if (path.node.operator !== '!') return;
    switch(path.node.argument.type){
      case 'ArrayExpression':
        if(path.node.argument.elements.length === 0) path.replaceWith(types.booleanLiteral(false));
        break;
      case 'UnaryExpression':
        if(path.node.argument.operator === '!' && types.isArrayExpression(path.node.argument.argument) && path.node.argument.argument.elements.length === 0) path.replaceWith(types.booleanLiteral(true));
        break;
      default:
        break;
    }
  }
}
traverse(AST, replaceUnaryExpressionsVisitor);


const array_name = 'a0_0x4af3';
const vars_that_reference = new Set();
const replaceReferencingBigArrayVisitor = {
  BlockStatement(path){
    if(!(
          types.isVariableDeclaration(path.node.body[0]) &&
           types.isIdentifier(path.node.body[0].declarations[0].init) &&
          types.isIdentifier(path.node.body[0].declarations[0].id)
        ))return 
     vars_that_reference.add(path.node.body[0].declarations[0].id.name);
     path.get('body.0.declarations.0').remove();
   },
   Identifier(path){
     if(!vars_that_reference.has(path.node.name))return;
     path.replaceWith(types.identifier(array_name));
   }
}
traverse(AST, replaceReferencingBigArrayVisitor);





fs.writeFileSync('out_script1.js', generate(AST, beautify_opts).code);
*/

// fs.writeFileSync("decoding_functions1.json", JSON.stringify(decodingFunctionsContext));
// const script = fs.readFileSync('out_script1.js', 'utf-8');
// const AST = parser.parse(script, {})
// const simpleOpWrapFunctions = {};
// // traverse(AST, {
// //   ObjectProperty(path) {
// //     if (!(types.isStringLiteral(path.node.key) &&
// //     types.isStringLiteral(path.node.value))) return;
// //     simpleOpWrapFunctions[path.node.key.value] = path.node.value.value;
// //     path.remove();
// //   },
// //   MemberExpression(path) {
// //     if (types.isIdentifier(path.node.object) &&
// //       types.isIdentifier(path.node.property) &&
// //       simpleOpWrapFunctions.hasOwnProperty(path.node.property.name)) {
// //         if(types.isAssignmentExpression(path.parentPath) &&
// //             path.key === 'left') return;
// //       let strValue = simpleOpWrapFunctions[path.node.property.name];
// //       let nodeToBeReplacedWith = types.stringLiteral(strValue);
// //       path.replaceWith(nodeToBeReplacedWith);
// //     }
// //   }
// // })
// const proxyFunctions = {};
// const replaceProxyFunctions = {
//   ObjectProperty(path) {
//     if (!(
//       types.isStringLiteral(path.node.key) &&
//       types.isFunctionExpression(path.node.value) &&
//       path.node.value.body.body.length === 1 &&
//       types.isReturnStatement(path.node.value.body.body[0])
//     )) return;
//     if (types.isCallExpression(path.node.value.body.body[0].argument) &&
//       types.isMemberExpression(path.node.value.body.body[0].argument.callee) &&
//       types.isIdentifier(path.node.value.body.body[0].argument.callee.property)) {
//       let _args = path.node.value.body.body[0].argument.arguments;
//       let clonedNode = proxyFunctions[path.node.value.body.body[0].argument.callee.property.name];
//       traverse(clonedNode, {
//         Identifier(identif_path) {
//           if (_args.length === 0) {
//             console.log("ERROR");
//             return;
//           }
//           identif_path.replaceWith(_args.shift());
//         }
//       }, {}, {}, {})
//       path.get('value.body.body.0.argument').replaceWith(clonedNode);
//       path.stop();
//     }
//     // let params = path.node.value.params;
//     // let i = 0;
//     // path.get('value.body.body.0.argument').traverse({
//     //   Identifier(path){
//     //     if(path.node.name === params[i].name){
//     //       path.node.name = 'param_' + i;
//     //       i++;
//     //     }
//     //   }
//     // })
//     // proxyFunctions[path.node.key.value] = path.get('value.body.body.0.argument');
//     proxyFunctions[path.node.key.value] = types.cloneNode(path.node.value.body.body[0].argument);
//     path.remove();
//   },
//   // MemberExpression(path){
//   //   if(!(types.isIdentifier(path.node.property) &&
//   //      proxyFunctions.hasOwnProperty(path.node.property.name)))return;
//   //   if(types.isReturnStatement(path.parentPath.parentPath))return;
//   //   let clonedNode = proxyFunctions[path.node.property.name];
//   //   let _arguments = path.parentPath.node.arguments;
//   //   clonedNode.traverse({
//   //   	Identifier(_path){
//   //       // if(_path.node.name.startsWith("param_")){
//   //         // console.log();
//   //         let node = _arguments.shift();
//   //         _path.replaceWith(node);
//   //       }
//   //   //  }
//   //   })
//   //   path.replaceWith(clonedNode);
//   // }
// }
// const strings = {};
// const replWithStringsInOtherProxyFunctions = {
//   ObjectProperty(path) {
//     if (path.node.key.type !== "StringLiteral" ||
//       path.node.value.type !== "StringLiteral") return;
//     strings[path.node.key.value] = path.node.value.value;
//   },
//   MemberExpression(path) {
//     if (!(path.key === "value" &&
//       path.parentPath.node.type === "ObjectProperty" &&
//       path.parentPath.node.key.type === "StringLiteral" &&
//       path.node.property.type === "Identifier" &&
//       path.node.object.type === "Identifier")) return;
//     let propname = path.node.property.name;
//     if (!strings.hasOwnProperty(propname)) return;
//     path.replaceWith(types.stringLiteral(strings[propname]));
//   }
// }
// traverse(AST, replWithStringsInOtherProxyFunctions);
// const _replProxyFuncsVisitor = {
//   ObjectProperty(path) {
//     if (!(path.node.key.type === "StringLiteral" &&
//       path.node.value.type === "FunctionExpression" &&
//       path.node.value.body.body.length === 1 &&
//       path.node.value.body.body[0].type === "ReturnStatement")) return;
//     let name = path.node.key.value;
//     let argument = path.node.value.body.body[0].argument;
//     if (argument.type === "CallExpression" &&
//       argument.callee.type === "MemberExpression") {
//       let args = argument.arguments;
//       // let argsnames = [];
//       // args.forEach(arg => argsnames.push(arg.name));
//       let prop = argument.callee.property
//       if (proxyFunctions.hasOwnProperty(prop.name)) {
//         let program = {
//           type: "Program",
//           body: [types.cloneDeepWithoutLoc(proxyFunctions[prop.name])]
//         };
//         traverse(program, {
//           Identifier: {
//             exit(identif_exit_path) {
//               let final_node = args.shift()
//               identif_exit_path.node = final_node;
//               identif_exit_path.skip();
//               // identif_exit_path.replaceWith(final_node);
//             }
//           }
//         })
//         path.get('value.body.body.0.argument').replaceWith(program.body[0]);
//       }
//     }
//     proxyFunctions[name] = types.cloneDeepWithoutLoc(argument);
//     path.remove();
//   },
//   MemberExpression(path) {
//     if (path.node.computed) return;
//     // if(path.parentPath &&
//     //     path.parentPath.parentPath &&
//     //     path.parentPath.parentPath.node.type === "ReturnStatement")return;
//     if (path.node.property.type === "Identifier" &&
//       !proxyFunctions.hasOwnProperty(path.node.property.name)) return;
//     if (path.key !== 'callee') return;
//     let name = path.node.property.name;
//     if (name === "sBWrs") console.log("Hit checkpoint 1");
//     let args = path.parentPath.node.arguments;
//     let program = {
//       type: "Program",
//       body: [types.cloneNode(proxyFunctions[name])]
//     }
//     program = parser.parse(generate(types.cloneDeepWithoutLoc(proxyFunctions[name])).code, {});
//     console.log(`Program before:\n${generate(program).code}`)
//     traverse(program, {
//       Identifier: {
//         exit(identif_exit_path) {
//           let node = args.shift();
//           console.log(`Identifier before: ${generate(identif_exit_path.node).code}`);
//           console.log(`Replacing Identifier with: ${generate(node).code}`);
//           if (node.type === "Identifier") {
//             identif_exit_path.node.name = node.name;
//           } else {
//             identif_exit_path.replaceWith(node);
//             identif_exit_path.skip();
//           }
//         }
//       }
//     })
//     console.log(`Program after:\n${generate(program).code}`);
//     path.parentPath.replaceWith(program.program.body[0]);
//   }
// }
// const replProxyFuncsVisitor = {
//   ObjectProperty(path) {
//     if (!(path.node.key.type === "StringLiteral" &&
//       path.node.value.type === "FunctionExpression" &&
//       path.node.value.body.body.length === 1 &&
//       path.node.value.body.body[0].type === "ReturnStatement")) return;
//     let name = path.node.key.value;
//     let argument = path.node.value.body.body[0].argument;
//     let _delete = true;
//     if (argument.type === "CallExpression" &&
//       argument.callee.type === "MemberExpression") {
//       /*
//       This matches:
//       const _0xccdd84 = {
//         'zSysN': function (_0x8f6c06, _0x4c1252, _0x72fab5) {
//           return _0x172aa3.HCDgu(_0x8f6c06, _0x4c1252, _0x72fab5);
//         }
//       }
//       */
//       let args = argument.arguments;
//       // let argsnames = [];
//       // args.forEach(arg => argsnames.push(arg.name));
//       let prop = argument.callee.property
//       if (proxyFunctions.hasOwnProperty(prop.name)) {
//         let program = {
//           type: "Program",
//           body: [types.cloneDeepWithoutLoc(proxyFunctions[prop.name])]
//         };
//         traverse(program, {
//           Identifier: {
//             exit(identif_exit_path) {
//               let final_node = args.shift()
//               //identif_exit_path.node.name = final_node.name;
//               identif_exit_path.replaceWith(final_node);
//               identif_exit_path.skip();
//               // identif_exit_path.replaceWith(final_node);
//             }
//           }
//         })
//         path.get('value.body.body.0.argument').replaceWith(program.body[0]);
//       } else {
//         _delete = false;
//       }
//     }
//     proxyFunctions[name] = types.cloneDeepWithoutLoc(path.node.value.body.body[0].argument);
//     if(_delete)path.remove();
//   },
//   MemberExpression(path) {
//     if (path.node.computed) return;
//     if (path.node.property.type === "Identifier" &&
//       !proxyFunctions.hasOwnProperty(path.node.property.name)) return;
//     if (path.key !== 'callee') return;
//     let name = path.node.property.name;
//     let args = path.parentPath.node.arguments;
//     let script_as_file = {
//       type: "File",
//       program: {
//         type: "Program",
//         body: [types.cloneDeepWithoutLoc(proxyFunctions[name])]
//       }
//     }
//     traverse(script_as_file, {
//       Identifier(identif_path) {
//           let node = args.shift();
//           identif_path.replaceWith(node);
//           identif_path.skip();
//       }
//     })
//     path.parentPath.replaceWith(script_as_file.program.body[0]);
//   }
// }
// traverse(AST, replProxyFuncsVisitor);
// const replAllRemainingStrings =
// Object.getOwnPropertyNames(proxyFunctions).forEach(proxyFuncPathName => {
//   console.log(generate(proxyFunctions[proxyFuncPathName].node).code);
// })
// fs.writeFileSync('out_script2.js', generate(AST, beautify_opts).code);


const script = fs.readFileSync('out_script.js', 'utf-8');

const AST = parser.parse(script, {})

const ifsWithMemberExprAsBinaryExprLeftNRightVisitor = {
  IfStatement(path) {
    if (!(path.node.test.type === "BinaryExpression" &&
      path.node.test.left.type === "MemberExpression" &&
      path.node.test.right.type === "MemberExpression")) return;
    let first = path.node.test.left.property.name;
    let second = path.node.test.right.property.name;
    let eval_script = `"${first}" ${path.node.test.operator} "${second}"`;

    try {
      let val = eval(eval_script);
      let has_alternate = path.node.alternate ? true : false;
      switch (val) {
        case true:
          if (path.node.consequent.body) {
            path.replaceWithMultiple(path.node.consequent.body);
          } else {
            path.replaceWith(path.node.consequent);
          }
          break;
        case false:
          if (has_alternate) {
            if (path.node.alternate.body) {
              path.replaceWithMultiple(path.node.alternate.body);
            } else {
              path.replaceWith(path.node.alternate);
            }
          } else {
            path.remove();
          }
          break;
      }
      path.get('test').replaceWith(types.booleanLiteral(val));
    } catch (e) {

    }
  }
}

traverse(AST, ifsWithMemberExprAsBinaryExprLeftNRightVisitor);

const stringComparisonInIfTestVisitor = {
  IfStatement(path) {
    if (path.node.test.type === "BinaryExpression" &&
      path.node.test.left.type === "StringLiteral" &&
      path.node.test.right.type === "StringLiteral") {
      try {
        let val = eval(generate(path.node.test).code);
        let has_alternate = path.node.alternate ? true : false;
        switch (val) {
          case true:
            if (path.node.consequent.body) {
              path.replaceWithMultiple(path.node.consequent.body);
            } else {
              path.replaceWith(path.node.consequent);
            }
            break;
          case false:
            if (has_alternate) {
              if (path.node.alternate.body) {
                path.replaceWithMultiple(path.node.alternate.body);
              } else {
                path.replaceWith(path.node.alternate);
              }
            } else {
              path.remove();
            }
            break;
        }
        path.get('test').replaceWith(types.booleanLiteral(val));
      } catch (e) {

      }
    }
  }
}

traverse(AST, stringComparisonInIfTestVisitor);

const renameCatchParamToErr = {
  CatchClause(path) {
    if (path.node.param.type !== 'Identifier') return;
    let catchParamName = path.node.param.name;
    path.scope.rename(catchParamName, 'err');
  }
}
traverse(AST, renameCatchParamToErr);

const transformHexNumericToDec = {
  NumericLiteral(path) {
    delete path.node.extra.raw;
  }
}
traverse(AST, transformHexNumericToDec);

const getRidOfUnusedObjects = {
  VariableDeclarator(path){
    if(!path.node.init)return;
    if(path.node.init.type !== "ObjectExpression")return;
    if(!path.get('id').isReferencedIdentifier()){
      path.remove();
    }
    // console.log(`${path.node.id.name} is ${path.get('id').isReferencedIdentifier() ? "referenced" : "NOT referenced"}`);


  }
}
traverse(AST, getRidOfUnusedObjects);

const methodDefinitionFromKeyLiteralToIdentifier = {
  ClassMethod(path){
    if(!(path.node.computed === true &&
      path.node.key.type === "StringLiteral"))return;
    path.node.computed = false;
    path.get('key').replaceWith(types.identifier(path.node.key.value));

  }
}
traverse(AST, methodDefinitionFromKeyLiteralToIdentifier);

fs.writeFileSync('out_script3.js', generate(AST, beautify_opts).code);