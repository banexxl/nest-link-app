import { StyleSheet } from 'react-native';

export const PRIMARY_COLOR = '#f68a00';

export const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pageHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  pageHeaderMeta: {
    fontSize: 12,
    color: '#888',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 84,
  },
  errorText: {
    color: '#d00',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyContainer: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  composerCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 1,
  },
  composerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  composerInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#fff',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  composerButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  composerButtonDisabled: {
    opacity: 0.7,
  },
  composerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  postCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 1,
  },
  postMeta: {
    fontSize: 11,
    color: '#777',
    marginBottom: 4,
  },
  postText: {
    fontSize: 14,
    color: '#222',
  },
  postFooterRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  postCounts: {
    fontSize: 12,
    color: '#777',
  },
  postCountsInteractive: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  postActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postActionButton: {
    marginLeft: 12,
  },
  postActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  postActionTextActive: {
    color: '#d9534f',
  },
  postActionTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  commentsContainer: {
    marginTop: 8,
  },
  commentsHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  commentRow: {
    marginTop: 4,
  },
  commentText: {
    fontSize: 13,
    color: '#222',
  },
  commentMeta: {
    fontSize: 11,
    color: '#888',
  },
  commentFooterRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentLikeButton: {
    marginLeft: 12,
  },
  commentLikeText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  commentLikeTextActive: {
    color: '#d9534f',
  },
  commentComposerRow: {
    marginTop: 8,
  },
  commentInput: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: '#fff',
    minHeight: 40,
    textAlignVertical: 'top',
  },
  commentSendButton: {
    marginTop: 6,
    alignSelf: 'flex-end',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: PRIMARY_COLOR,
  },
  commentSendText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadMoreCommentsButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  loadMoreCommentsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#555',
  },
  likesModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likesModalCard: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  likesModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  likesModalList: {
    maxHeight: 260,
    marginBottom: 10,
  },
  likesModalItem: {
    fontSize: 14,
    color: '#333',
    paddingVertical: 4,
  },
  likesModalCloseButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR,
  },
  likesModalCloseText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  loadMorePostsContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  loadMorePostsButton: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  loadMorePostsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  liCard: {
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },

  liHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  liAvatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  liAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },

  liHeaderMeta: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  liAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  liSubMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  liSubMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  liDot: {
    marginHorizontal: 6,
    fontSize: 12,
    color: '#9CA3AF',
  },
  liHeaderMenu: {
    paddingLeft: 10,
    paddingVertical: 6,
  },
  liMenuDots: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '700',
  },

  liPostText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
  },
  liSeeMore: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Media: make it feel more like LI (bigger, edge-to-edge)
  imageThumb: {
    width: 220,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  imagePlaceholder: {
    width: 220,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  liCountsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liLikeCountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liLikeDotBadge: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  liLikeDotBadgeText: {
    fontSize: 11,
  },
  liCountsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  liCountsTextRight: {
    fontSize: 12,
    color: '#6B7280',
  },

  liDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 10,
  },

  liActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  liActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  liActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  liActionTextActive: {
    color: PRIMARY_COLOR,
  },

  liCommentsBlock: {
    paddingTop: 8,
  },
  liViewAllComments: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  liCommentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  liCommentBubble: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  liCommentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  liCommentAuthor: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  liCommentTime: {
    fontSize: 11,
    color: '#6B7280',
  },
  liCommentText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#111827',
  },
  liCommentActionsRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liMiniAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  liMiniActionActive: {
    color: PRIMARY_COLOR,
  },

  liCommentComposerRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  liCommentInputWrap: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  liCommentInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    maxHeight: 110,
    paddingVertical: 0,
  },
  liSendBtn: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  liSendBtnDisabled: {
    opacity: 0.6,
  },
  liSendBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});
