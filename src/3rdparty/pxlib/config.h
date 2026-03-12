/* Simple config.h for bundled pxlib */
#ifndef PXLIB_CONFIG_H
#define PXLIB_CONFIG_H

#define HAVE_CONFIG_H 1
#define STDC_HEADERS 1
#define HAVE_SYS_TYPES_H 1
#define HAVE_STDINT_H 1
#define HAVE_STDBOOL_H 1
#define HAVE_ERRNO_H 1
#define HAVE_FCNTL_H 1
#define HAVE_STDDEF_H 1
#define HAVE_STDARG_H 1
#define HAVE_MALLOC_H 1
#define HAVE_STRING_H 1
#define HAVE_TIME_H 1
#define HAVE_MEMORY_H 1
#define HAVE_SYS_TIME_H 1
/* WORDS_BIGENDIAN must NOT be defined on little-endian (x86/x64 Windows).
   get_double_be uses #ifdef WORDS_BIGENDIAN (not #if), so defining it as 0
   still activates the memcpy branch instead of the correct byte-swap. */
#undef WORDS_BIGENDIAN
#define HAVE_GSF 0

#endif /* PXLIB_CONFIG_H */
