export const rand = (a:number, b:number):number=>{
    return Math.random()*(b - a) + a
}

export const guard = (val:number, min:number, max:number)=> Math.max(min, Math.min(val, max))

export type AccumFields = {
	accumulatedTriangles?: Set<number>,
	accumulatedIndices?: Set<number>,
	accumulatedTraversedNodeIndices?: Set<number>,
}