import { Testimonial } from "./Testimonial.tsx";
import type { TestimonialProps } from "./Testimonial.tsx";
import metadata from "./Testimonial.meta.ts";

export const controls = metadata.props;
export default function TestimonialDemo(props: TestimonialProps) { return <Testimonial {...props} />; }
