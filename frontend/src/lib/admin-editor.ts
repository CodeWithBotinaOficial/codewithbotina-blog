import { t, type SupportedLanguage } from "./i18n";

export interface PostEditorLabels {
  accessChecking: string;
  accessControl: {
    signInRequired: string;
    signInDescription: string;
    signInButton: string;
    accessDenied: string;
    notAuthorized: string;
    redirecting: string;
    adminOnly: string;
  };
  titleLabel: string;
  titlePlaceholder: string;
  slugLabel: string;
  slugPlaceholder: string;
  slugHint: string;
  slugChecking: string;
  languageLabel: string;
  contentLabel: string;
  rawTab: string;
  previewTab: string;
  bodyPlaceholder: string;
  characterCount: string;
  featuredImageLabel: string;
  imageUrlLabel: string;
  imageUrlOption: string;
  imageUploadOption: string;
  imageFileLabel: string;
  imageTitleLabel: string;
  imageUrlPlaceholder: string;
  imageTitlePlaceholder: string;
  imageHelp: string;
  imageDropTitle: string;
  imageDropSubtitle: string;
  imageDropActive: string;
  imageReplaceLabel: string;
  imageRemoveLabel: string;
  imageFileName: string;
  imageFileSize: string;
  imageDimensions: string;
  useLinkedPostImage: string;
  inheritedImageFrom: string;
  translationsTitle: string;
  translationsEmpty: string;
  translationsSearchPlaceholder: string;
  translationsSearching: string;
  translationsNoResults: string;
  translationsRemoveLabel: string;
  translationsLanguageLabel: string;
  translationsDateLabel: string;
  imageSection: {
    uploadNew: string;
    selectFromLibrary: string;
    externalUrl: string;
    useThisImage: string;
    cancel: string;
    noImages: string;
    filenameReadOnly: string;
    searchImages: string;
    selectedImage: string;
    pickHint: string;
    fileInfo: string;
    filename: string;
    fileSize: string;
    dimensions: string;
    uploadedOn: string;
    loading: string;
    error: string;
    retry: string;
    loadMore: string;
  };
  submitCreate: string;
  submitUpdate: string;
  submitting: string;
  cancel: string;
  submitDisabledHint: string;
  updateDisabledHint: string;
  confirmCreateTitle: string;
  confirmCreateMessage: string;
  confirmUpdateTitle: string;
  confirmUpdateMessage: string;
  confirmCreateAction: string;
  confirmUpdateAction: string;
  toastSuccessCreate: string;
  toastSuccessUpdate: string;
  toastError: string;
  errors: {
    titleRequired: string;
    titleTooLong: string;
    slugRequired: string;
    slugInvalid: string;
    slugExists: string;
    slugCheckFailed: string;
    languageInvalid: string;
    bodyTooShort: string;
    bodyTooLong: string;
    imageUrlInvalid: string;
    imageFileRequired: string;
    imageFileType: string;
    imageFileSize: string;
    imageTitleRequired: string;
  };
}

export interface TagSelectorLabels {
  title: string;
  emptyHint: string;
  inputPlaceholder: string;
  noResults: string;
  createLabel: string;
  suggestionsTitle: string;
  loadingSuggestions: string;
  suggestionsError: string;
  postsCount: string;
  removeLabel: string;
}

export function getPostEditorLabels(language: SupportedLanguage): PostEditorLabels {
  return {
    accessChecking: t(language, "editor.accessChecking", "admin"),
    accessControl: {
      signInRequired: t(language, "accessControl.signInRequired", "admin"),
      signInDescription: t(language, "accessControl.signInDescription", "admin"),
      signInButton: t(language, "accessControl.signInButton", "admin"),
      accessDenied: t(language, "accessControl.accessDenied", "admin"),
      notAuthorized: t(language, "accessControl.notAuthorized", "admin"),
      redirecting: t(language, "accessControl.redirecting", "admin"),
      adminOnly: t(language, "accessControl.adminOnly", "admin"),
    },
    titleLabel: t(language, "editor.titleLabel", "admin"),
    titlePlaceholder: t(language, "editor.titlePlaceholder", "admin"),
    slugLabel: t(language, "editor.slugLabel", "admin"),
    slugPlaceholder: t(language, "editor.slugPlaceholder", "admin"),
    slugHint: t(language, "editor.slugHint", "admin"),
    slugChecking: t(language, "editor.slugChecking", "admin"),
    languageLabel: t(language, "editor.languageLabel", "admin"),
    contentLabel: t(language, "editor.contentLabel", "admin"),
    rawTab: t(language, "editor.rawTab", "admin"),
    previewTab: t(language, "editor.previewTab", "admin"),
    bodyPlaceholder: t(language, "editor.bodyPlaceholder", "admin"),
    characterCount: t(language, "editor.characterCount", "admin"),
    featuredImageLabel: t(language, "editor.featuredImageLabel", "admin"),
    imageUrlLabel: t(language, "editor.imageUrlLabel", "admin"),
    imageUrlOption: t(language, "editor.imageUrlOption", "admin"),
    imageUploadOption: t(language, "editor.imageUploadOption", "admin"),
    imageFileLabel: t(language, "editor.imageFileLabel", "admin"),
    imageTitleLabel: t(language, "editor.imageTitleLabel", "admin"),
    imageUrlPlaceholder: t(language, "editor.imageUrlPlaceholder", "admin"),
    imageTitlePlaceholder: t(language, "editor.imageTitlePlaceholder", "admin"),
    imageHelp: t(language, "editor.imageHelp", "admin"),
    imageDropTitle: t(language, "editor.imageDropTitle", "admin"),
    imageDropSubtitle: t(language, "editor.imageDropSubtitle", "admin"),
    imageDropActive: t(language, "editor.imageDropActive", "admin"),
    imageReplaceLabel: t(language, "editor.imageReplaceLabel", "admin"),
    imageRemoveLabel: t(language, "editor.imageRemoveLabel", "admin"),
    imageFileName: t(language, "editor.imageFileName", "admin"),
    imageFileSize: t(language, "editor.imageFileSize", "admin"),
    imageDimensions: t(language, "editor.imageDimensions", "admin"),
    useLinkedPostImage: t(language, "editor.useLinkedPostImage", "admin"),
    inheritedImageFrom: t(language, "editor.inheritedImageFrom", "admin"),
    translationsTitle: t(language, "editor.translationsTitle", "admin"),
    translationsEmpty: t(language, "editor.translationsEmpty", "admin"),
    translationsSearchPlaceholder: t(language, "editor.translationsSearchPlaceholder", "admin"),
    translationsSearching: t(language, "editor.translationsSearching", "admin"),
    translationsNoResults: t(language, "editor.translationsNoResults", "admin"),
    translationsRemoveLabel: t(language, "editor.translationsRemoveLabel", "admin"),
    translationsLanguageLabel: t(language, "editor.translationsLanguageLabel", "admin"),
    translationsDateLabel: t(language, "editor.translationsDateLabel", "admin"),
    imageSection: {
      uploadNew: t(language, "editor.imageSection.uploadNew", "admin"),
      selectFromLibrary: t(language, "editor.imageSection.selectFromLibrary", "admin"),
      externalUrl: t(language, "editor.imageSection.externalUrl", "admin"),
      useThisImage: t(language, "editor.imageSection.useThisImage", "admin"),
      cancel: t(language, "editor.imageSection.cancel", "admin"),
      noImages: t(language, "editor.imageSection.noImages", "admin"),
      filenameReadOnly: t(language, "editor.imageSection.filenameReadOnly", "admin"),
      searchImages: t(language, "editor.imageSection.searchImages", "admin"),
      selectedImage: t(language, "editor.imageSection.selectedImage", "admin"),
      pickHint: t(language, "editor.imageSection.pickHint", "admin"),
      fileInfo: t(language, "editor.imageSection.fileInfo", "admin"),
      filename: t(language, "editor.imageSection.filename", "admin"),
      fileSize: t(language, "editor.imageSection.fileSize", "admin"),
      dimensions: t(language, "editor.imageSection.dimensions", "admin"),
      uploadedOn: t(language, "editor.imageSection.uploadedOn", "admin"),
      loading: t(language, "editor.imageSection.loading", "admin"),
      error: t(language, "editor.imageSection.error", "admin"),
      retry: t(language, "editor.imageSection.retry", "admin"),
      loadMore: t(language, "editor.imageSection.loadMore", "admin"),
    },
    submitCreate: t(language, "editor.submitCreate", "admin"),
    submitUpdate: t(language, "editor.submitUpdate", "admin"),
    submitting: t(language, "editor.submitting", "admin"),
    cancel: t(language, "editor.cancel", "admin"),
    submitDisabledHint: t(language, "editor.submitDisabledHint", "admin"),
    updateDisabledHint: t(language, "editor.updateDisabledHint", "admin"),
    confirmCreateTitle: t(language, "editor.confirmCreateTitle", "admin"),
    confirmCreateMessage: t(language, "editor.confirmCreateMessage", "admin"),
    confirmUpdateTitle: t(language, "editor.confirmUpdateTitle", "admin"),
    confirmUpdateMessage: t(language, "editor.confirmUpdateMessage", "admin"),
    confirmCreateAction: t(language, "editor.confirmCreateAction", "admin"),
    confirmUpdateAction: t(language, "editor.confirmUpdateAction", "admin"),
    toastSuccessCreate: t(language, "editor.toastSuccessCreate", "admin"),
    toastSuccessUpdate: t(language, "editor.toastSuccessUpdate", "admin"),
    toastError: t(language, "editor.toastError", "admin"),
    errors: {
      titleRequired: t(language, "errors.titleRequired", "admin"),
      titleTooLong: t(language, "errors.titleTooLong", "admin"),
      slugRequired: t(language, "errors.slugRequired", "admin"),
      slugInvalid: t(language, "errors.slugInvalid", "admin"),
      slugExists: t(language, "errors.slugExists", "admin"),
      slugCheckFailed: t(language, "errors.slugCheckFailed", "admin"),
      languageInvalid: t(language, "errors.languageInvalid", "admin"),
      bodyTooShort: t(language, "errors.bodyTooShort", "admin"),
      bodyTooLong: t(language, "errors.bodyTooLong", "admin"),
      imageUrlInvalid: t(language, "errors.imageUrlInvalid", "admin"),
      imageFileRequired: t(language, "errors.imageFileRequired", "admin"),
      imageFileType: t(language, "errors.imageFileType", "admin"),
      imageFileSize: t(language, "errors.imageFileSize", "admin"),
      imageTitleRequired: t(language, "errors.imageTitleRequired", "admin"),
    },
  };
}

export function getTagSelectorLabels(language: SupportedLanguage): TagSelectorLabels {
  return {
    title: t(language, "tags.title", "admin"),
    emptyHint: t(language, "tags.emptyHint", "admin"),
    inputPlaceholder: t(language, "tags.inputPlaceholder", "admin"),
    noResults: t(language, "tags.noResults", "admin"),
    createLabel: t(language, "tags.createLabel", "admin"),
    suggestionsTitle: t(language, "tags.suggestionsTitle", "admin"),
    loadingSuggestions: t(language, "tags.loadingSuggestions", "admin"),
    suggestionsError: t(language, "tags.suggestionsError", "admin"),
    postsCount: t(language, "tags.postsCount", "admin"),
    removeLabel: t(language, "tags.removeLabel", "admin"),
  };
}
