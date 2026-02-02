#include "paradox.h"
#include <stddef.h>

pxdoc_t *pxlib_new_document(void) {
    return PX_new();
}

int pxlib_open_document(pxdoc_t *doc, const char *path) {
    if (!doc || !path) {
        return -1;
    }
    return PX_open_file(doc, path);
}

void pxlib_close_document(pxdoc_t *doc) {
    if (!doc) {
        return;
    }
    PX_close(doc);
    PX_delete(doc);
}

int pxlib_num_records(pxdoc_t *doc) {
    if (!doc) {
        return 0;
    }
    return PX_get_num_records(doc);
}

int pxlib_field_count(pxdoc_t *doc) {
    if (!doc) {
        return 0;
    }
    return PX_get_num_fields(doc);
}

pxfield_t *pxlib_get_fields(pxdoc_t *doc) {
    if (!doc) {
        return NULL;
    }
    return PX_get_fields(doc);
}

int pxlib_record_size(pxdoc_t *doc) {
    if (!doc) {
        return 0;
    }
    return PX_get_recordsize(doc);
}

int pxlib_file_version(pxdoc_t *doc) {
    if (!doc || !doc->px_head) {
        return 0;
    }
    return doc->px_head->px_fileversion;
}

int pxlib_header_size(pxdoc_t *doc) {
    if (!doc || !doc->px_head) {
        return 0;
    }
    return doc->px_head->px_headersize;
}

int pxlib_code_page(pxdoc_t *doc) {
    if (!doc || !doc->px_head) {
        return 0;
    }
    return doc->px_head->px_doscodepage;
}

pxval_t **pxlib_retrieve_record(pxdoc_t *doc, int recno) {
    if (!doc) {
        return NULL;
    }
    return PX_retrieve_record(doc, recno);
}

static int pxlib_is_string_type(pxval_t *value) {
    if (value == NULL) {
        return 0;
    }
    switch (value->type) {
        case pxfAlpha:
        case pxfMemoBLOb:
        case pxfBLOb:
        case pxfFmtMemoBLOb:
        case pxfGraphic:
        case pxfBytes:
        case pxfBCD:
            return 1;
        default:
            return 0;
    }
}

void pxlib_release_record(pxdoc_t *doc, pxval_t **record) {
    if (!doc || !record) {
        return;
    }
    int num_fields = PX_get_num_fields(doc);
    for (int i = 0; i < num_fields; i++) {
        pxval_t *value = record[i];
        if (value == NULL) {
            continue;
        }
        if (pxlib_is_string_type(value) && value->value.str.val != NULL) {
            doc->free(doc, value->value.str.val);
        }
        FREE_PXVAL(doc, value);
    }
    doc->free(doc, record);
}
