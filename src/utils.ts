export const rand = (a:number, b:number):number=>{
    return Math.random()*(b - a) + a
}

export const guard = (val:number, min:number, max:number)=> Math.max(min, Math.min(val, max))

export type AccumFields = {
	accumulatedTriangles?: Set<number>,
	accumulatedIndices?: Set<number>,
	accumulatedTraversedNodeIndices?: Set<number>,
}

type Clr = {
	r:number,
	g:number,
	b:number
}

/**
 * Mix using weight
 * Eg. weight = 1 means 100% of c1
 * @param c1 
 * @param c2 
 * @param weight 
 * @returns 
 */
export const getWeightedColor = (c1:Clr, c2: Clr, weight:number):Clr => {
	return {
		r: c1.r * weight + c2.r * (1 - weight),
		g: c1.g * weight + c2.g * (1 - weight),
		b: c1.b * weight + c2.b * (1 - weight),
	}
}