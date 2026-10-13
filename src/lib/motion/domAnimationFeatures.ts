import { domAnimation } from 'framer-motion'

/**
 * The animation features LazyMotion loads after the first paint. Kept in its own module so the bundler
 * puts them in a separate chunk: the UI renders at once with the tiny `m` components, and the
 * initial/animate/exit transitions switch on as soon as this chunk arrives.
 * domAnimation covers everything the app uses; drag and layout animations (domMax) are not needed.
 */
export default domAnimation
