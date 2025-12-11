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
  imageThumb: {
    width: 120,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  imagePlaceholder: {
    width: 120,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
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
});
