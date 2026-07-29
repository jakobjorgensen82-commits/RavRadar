export function buildScoreDebugTrace({mode,zone,weather,history,components,weights,transportDiagnostics,adaptive,ruleEvaluation,rawScore,baseScore,finalScore}){
  return {
    schemaVersion:'1.0', mode, zoneId:zone?.id||zone?.properties?.id||null,
    inputs:{weather:{...weather},history:{...history},zone:{onshoreDirectionDeg:zone?.onshoreDirectionDeg,directionAnchors:zone?.directionAnchors||[],coastType:zone?.coastType,shallowWater:!!zone?.shallowWater,reefs:!!zone?.reefs,seagrass:!!zone?.seagrass}},
    direction:{...transportDiagnostics},
    components:{...components},weights:{...weights},
    formula:{rawScore,baseScore,finalScore},
    adaptive:{adjustment:adaptive?.adjustment||0,matches:adaptive?.matches||[]},
    rules:{blocked:!!ruleEvaluation?.blocked,matches:ruleEvaluation?.matches||[],score:ruleEvaluation?.score??null},
    generatedAt:new Date().toISOString()
  };
}
